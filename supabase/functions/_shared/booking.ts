// Deterministic appointment booking flow (Deno IO).
//
// Sits in front of the FAQ/LLM pipeline for booking-related turns:
//   1. QUALIFY  — collect the customer's name and (when there is a choice) the
//      service, capturing details into the thread's booking_context.
//   2. OFFER    — propose concrete open times computed from the provider's
//      schedule (availability.ts) for the chosen service's duration.
//   3. BOOK     — when the client picks one of the offered times, create a
//      tentative booking and confirm.
// Because it only ever offers/books times it computed, the agent can never book
// a slot it did not propose. Pure decision/parse logic lives in availability.ts,
// bookingLogic.ts, and qualification.ts (shared with vitest); this module does
// the Supabase IO and timezone resolution and is Deno-only.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.55.0';
import {
  computeFreeSlots,
  formatSlotOffer,
  type BusyInterval,
  type OpenSlot,
  type TimeOffRange,
  type WeeklyAvailability,
} from './availability.ts';
import { formatBookingConfirmation, isDecline, selectSlot } from './bookingLogic.ts';
import { syncBookingToCalendar } from './calendar.ts';
import {
  captureDetails,
  nextQualificationStep,
  type Lead,
  type ServiceLite,
} from './qualification.ts';
import type { MessageIntent } from './agentLogic.ts';

type Admin = SupabaseClient;

interface ThreadCtx {
  id: string;
  state: string | null;
  clientHandle: string | null;
  /** Raw threads.booking_context jsonb. */
  bookingContext: Record<string, unknown> | null;
}

interface BookingContextValue {
  offered?: OpenSlot[];
  lead?: Lead;
  /** True when the previous turn asked for the customer's name. */
  expectingName?: boolean;
}

export interface BookingTurn {
  /** True when the booking handler produced the reply (skip FAQ/LLM). */
  handled: boolean;
  replyText?: string;
  /** New thread.state to apply (overrides the default state machine). */
  newState?: string;
  bookingId?: string | null;
  detail?: Record<string, unknown>;
}

const SCAN_DAYS = 14;
const MIN_LEAD_MINUTES = 60;
const OFFER_COUNT = 3;
const DEFAULT_DURATION_MINUTES = 60;

const NOT_HANDLED: BookingTurn = { handled: false };

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Minutes east of UTC for an IANA timezone at a given instant (0 on failure). */
function tzOffsetMinutes(timeZone: string, date: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour === '24' ? '0' : parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return Math.round((asUtc - date.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

interface ServiceFull extends ServiceLite {
  amountCents: number | null;
  currency: string | null;
}

interface SchedulingConfig {
  weekly: WeeklyAvailability[];
  bookings: BusyInterval[];
  timeOff: TimeOffRange[];
  offsetMinutes: number;
  fromDateLocal: string;
  services: ServiceFull[];
}

async function loadSchedulingConfig(admin: Admin, userId: string, timezone: string): Promise<SchedulingConfig | null> {
  const now = new Date();
  const offsetMinutes = tzOffsetMinutes(timezone || 'UTC', now);
  const localNow = new Date(now.getTime() + offsetMinutes * 60_000);
  const fromDateLocal = `${localNow.getUTCFullYear()}-${pad(localNow.getUTCMonth() + 1)}-${pad(localNow.getUTCDate())}`;

  const [availRes, svcRes, offRes, bookRes] = await Promise.all([
    admin.from('availability').select('day_of_week, start_time, end_time, active').eq('provider_id', userId).eq('active', true),
    admin
      .from('services')
      .select('id, name, duration_minutes, price_cents, currency, active, sort_order')
      .eq('provider_id', userId)
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    admin.from('time_off').select('start_date, end_date').eq('user_id', userId),
    admin
      .from('bookings')
      .select('start, end, status')
      .eq('user_id', userId)
      .gte('start', new Date(now.getTime() - 24 * 60 * 60_000).toISOString()),
  ]);

  const weekly: WeeklyAvailability[] = ((availRes.data ?? []) as Array<{ day_of_week: number; start_time: string; end_time: string; active: boolean }>).map(
    (a) => ({ dayOfWeek: a.day_of_week, startTime: a.start_time, endTime: a.end_time, active: a.active }),
  );
  if (weekly.length === 0) return null; // no schedule configured → let normal pipeline handle it

  const services: ServiceFull[] = ((svcRes.data ?? []) as Array<{ id: string; name: string; duration_minutes: number; price_cents: number; currency: string }>).map(
    (s) => ({ id: s.id, name: s.name, durationMinutes: s.duration_minutes, amountCents: s.price_cents ?? null, currency: s.currency ?? null }),
  );

  return {
    weekly,
    bookings: ((bookRes.data ?? []) as Array<{ start: string; end: string; status: string }>).map((b) => ({
      start: b.start,
      end: b.end,
      status: b.status,
    })),
    timeOff: ((offRes.data ?? []) as Array<{ start_date: string; end_date: string }>).map((t) => ({
      startDate: t.start_date,
      endDate: t.end_date,
    })),
    offsetMinutes,
    fromDateLocal,
    services,
  };
}

/** The service the lead picked, the only service if there is one, or null. */
function chosenService(lead: Lead, cfg: SchedulingConfig): ServiceFull | null {
  if (lead.serviceId) return cfg.services.find((s) => s.id === lead.serviceId) ?? null;
  if (cfg.services.length === 1) return cfg.services[0];
  return null;
}

function freshOffer(cfg: SchedulingConfig, durationMinutes: number, excludeStartIso: Set<string> = new Set()): OpenSlot[] {
  const slots = computeFreeSlots({
    weekly: cfg.weekly,
    bookings: cfg.bookings,
    timeOff: cfg.timeOff,
    durationMinutes,
    fromDateLocal: cfg.fromDateLocal,
    days: SCAN_DAYS,
    offsetMinutes: cfg.offsetMinutes,
    minLeadMinutes: MIN_LEAD_MINUTES,
    maxSlots: OFFER_COUNT + excludeStartIso.size,
  });
  return slots.filter((s) => !excludeStartIso.has(s.startIso)).slice(0, OFFER_COUNT);
}

async function setBookingContext(admin: Admin, threadId: string, ctx: BookingContextValue): Promise<void> {
  await admin.from('threads').update({ booking_context: ctx }).eq('id', threadId);
}

function lite(services: ServiceFull[]): ServiceLite[] {
  return services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes }));
}

/**
 * Handle a booking-related turn. Returns { handled:false } when booking is not in
 * play (so the caller falls through to the FAQ/LLM pipeline): not a booking
 * intent and not mid-flow, no schedule configured, or an ambiguous reply to an
 * offer that the LLM should help with.
 */
export async function handleBookingTurn(
  admin: Admin,
  params: {
    userId: string;
    thread: ThreadCtx;
    inboundText: string;
    intent: MessageIntent;
    businessName?: string | null;
    timezone?: string | null;
  },
): Promise<BookingTurn> {
  const { userId, thread, inboundText, intent, businessName, timezone } = params;
  const ctx = (thread.bookingContext ?? {}) as BookingContextValue;
  const offered = ctx.offered ?? [];
  const inOffering = thread.state === 'offering' && offered.length > 0;
  const inQualifying = thread.state === 'qualifying';
  const wantsBooking = intent === 'booking' || intent === 'availability';
  if (!inOffering && !inQualifying && !wantsBooking) return NOT_HANDLED;

  const cfg = await loadSchedulingConfig(admin, userId, timezone || 'UTC');
  if (!cfg) return NOT_HANDLED;

  // --- Branch A: the client is replying to times we already offered. ---------
  if (inOffering) {
    const lead = ctx.lead ?? {};
    if (isDecline(inboundText)) {
      const duration = chosenService(lead, cfg)?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
      const next = freshOffer(cfg, duration, new Set(offered.map((s) => s.startIso)));
      if (next.length === 0) {
        await setBookingContext(admin, thread.id, { lead });
        return { handled: true, replyText: formatSlotOffer([]), newState: 'qualifying', detail: { action: 'no_more_slots' } };
      }
      await setBookingContext(admin, thread.id, { lead, offered: next });
      return { handled: true, replyText: formatSlotOffer(next), newState: 'offering', detail: { action: 'reoffer', count: next.length } };
    }

    const selection = selectSlot(inboundText, offered);
    if (!selection) return NOT_HANDLED; // ambiguous → let the LLM help, keep context

    const svc = chosenService(lead, cfg);
    const { data: booking } = await admin
      .from('bookings')
      .insert({
        user_id: userId,
        thread_id: thread.id,
        start: selection.slot.startIso,
        end: selection.slot.endIso,
        status: 'tentative',
        service_id: svc?.id ?? null,
        client_name: lead.name ?? thread.clientHandle,
        client_contact: lead.contact ?? thread.clientHandle,
        source: 'ai',
        amount_cents: svc?.amountCents ?? null,
        currency: svc?.currency ?? null,
      })
      .select('id')
      .single();

    // Best-effort push to the connected calendar (stamps booking.calendar_event_id).
    let calendar: { synced: boolean; externalEventId?: string; reason?: string } = { synced: false };
    if (booking?.id) {
      calendar = await syncBookingToCalendar(admin, {
        userId,
        bookingId: booking.id,
        startIso: selection.slot.startIso,
        endIso: selection.slot.endIso,
        serviceName: svc?.name ?? null,
        clientName: lead.name ?? thread.clientHandle,
      });
    }

    await setBookingContext(admin, thread.id, {});
    return {
      handled: true,
      replyText: formatBookingConfirmation(selection.slot, businessName),
      newState: 'tentative',
      bookingId: booking?.id ?? null,
      detail: { action: 'booked', slot: selection.slot, reason: selection.reason, lead, calendar },
    };
  }

  // --- Branch Q: qualify (collect name + service) before offering. ------------
  const priorLead = ctx.lead ?? {};
  const lead = captureDetails(priorLead, inboundText, lite(cfg.services), ctx.expectingName === true);
  lead.contact = lead.contact ?? thread.clientHandle;

  const step = nextQualificationStep(lead, lite(cfg.services));
  if (step.kind !== 'ready') {
    await setBookingContext(admin, thread.id, { lead, expectingName: step.kind === 'ask_name' });
    return { handled: true, replyText: step.prompt, newState: 'qualifying', detail: { action: 'qualify', ask: step.kind, lead } };
  }

  // --- Branch B: ready → offer concrete times for the chosen service. ---------
  const duration = chosenService(lead, cfg)?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const slots = freshOffer(cfg, duration);
  if (slots.length === 0) {
    await setBookingContext(admin, thread.id, { lead });
    return { handled: true, replyText: formatSlotOffer([]), newState: 'qualifying', detail: { action: 'no_slots', lead } };
  }
  await setBookingContext(admin, thread.id, { lead, offered: slots });
  return { handled: true, replyText: formatSlotOffer(slots), newState: 'offering', detail: { action: 'offer', count: slots.length, lead } };
}
