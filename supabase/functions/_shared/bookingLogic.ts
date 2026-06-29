// Booking conversation logic — pure, runtime-agnostic, dependency-free.
//
// After the agent offers concrete times (computed by availability.ts), this
// interprets the client's reply: did they pick a slot, say yes to a single
// offer, decline, or ask for something else? It works only against the slots we
// actually offered, so the agent can never "book" a time it didn't propose.
// Imports nothing so it is shared by the Edge runtime and vitest.

import type { OpenSlot } from './availability.ts';

export type SelectionReason =
  | 'single_affirmation' // one slot offered + a yes
  | 'ordinal' // "the first one", "option 2", "last"
  | 'time' // "2pm", "14:00"
  | 'weekday' // "tuesday" (unique among offers)
  | 'weekday_time'; // "tuesday at 2"

export interface SlotSelection {
  index: number;
  slot: OpenSlot;
  reason: SelectionReason;
}

const AFFIRMATIVE = [
  'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'sounds good', 'sounds great',
  'that works', 'works for me', 'perfect', 'great', 'lets do it', "let's do it",
  'book it', 'book me', 'confirm', 'confirmed', 'go ahead', 'please do',
];

const NEGATIVE = [
  'no thanks', 'no thank', 'not really', 'none of', 'none work', 'doesnt work',
  "doesn't work", 'cant make', "can't make", 'another time', 'other times',
  'different day', 'different time', 'something else', 'nvm', 'never mind',
];

const ORDINAL_WORDS: Record<string, number> = {
  first: 0, '1st': 0, one: 0,
  second: 1, '2nd': 1, two: 1,
  third: 2, '3rd': 2, three: 2,
  fourth: 3, '4th': 3, four: 3,
  fifth: 4, '5th': 4, five: 4,
};

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function normalize(text: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasAny(text: string, phrases: string[]): boolean {
  const t = ` ${text} `;
  return phrases.some((p) => t.includes(` ${normalize(p)} `));
}

export function isAffirmative(text: string): boolean {
  return hasAny(normalize(text), AFFIRMATIVE);
}

export function isDecline(text: string): boolean {
  return hasAny(normalize(text), NEGATIVE);
}

/** Parse a clock time from free text → minutes since midnight (local), or null. */
export function parseClockMinutes(text: string): number | null {
  const t = normalize(text);
  // 12-hour with am/pm: "2pm", "2:30 pm", "11 am".
  let m = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/.exec(t);
  if (m) {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (h < 1 || h > 12 || min > 59) return null;
    if (m[3] === 'pm' && h !== 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }
  // 24-hour "14:00".
  m = /\b(\d{1,2}):(\d{2})\b/.exec(t);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  return null;
}

/** A slot's local time-of-day in minutes, parsed back from its label ("… · 2:00 PM"). */
function slotMinutes(slot: OpenSlot): number | null {
  const part = slot.label.split('·')[1];
  if (!part) return null;
  return parseClockMinutes(part);
}

/** A slot's weekday index (0=Sun), parsed from its label prefix ("Tue, …"). */
function slotWeekday(slot: OpenSlot): number | null {
  const head = normalize(slot.label.split(',')[0]);
  return head in WEEKDAYS ? WEEKDAYS[head] : null;
}

function firstOrdinal(text: string): number | null {
  const t = normalize(text);
  // "option 2" / "number 3" / "#2" → numeric index.
  const numMatch = /\b(?:option|number|no|#)\s*(\d)\b/.exec(t);
  if (numMatch) return Number(numMatch[1]) - 1;
  if (/\blast\b/.test(t)) return -1; // sentinel: caller maps to last index
  for (const word of Object.keys(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return ORDINAL_WORDS[word];
  }
  return null;
}

/**
 * Decide which offered slot (if any) the client chose. Returns null when the
 * reply is ambiguous, a decline, or selects nothing — the caller should then
 * re-offer or hand off rather than guess.
 */
export function selectSlot(text: string, offered: OpenSlot[]): SlotSelection | null {
  if (!offered.length) return null;
  const t = normalize(text);
  if (isDecline(t)) return null;

  const requestedWeekday = (() => {
    for (const [name, idx] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${name}\\b`).test(t)) return idx;
    }
    return null;
  })();
  const requestedTime = parseClockMinutes(t);

  // 1. Weekday + time → exact pinpoint.
  if (requestedWeekday !== null && requestedTime !== null) {
    const idx = offered.findIndex((s) => slotWeekday(s) === requestedWeekday && slotMinutes(s) === requestedTime);
    if (idx >= 0) return { index: idx, slot: offered[idx], reason: 'weekday_time' };
  }

  // 2. Explicit time, unique among offers.
  if (requestedTime !== null) {
    const matches = offered.map((s, i) => (slotMinutes(s) === requestedTime ? i : -1)).filter((i) => i >= 0);
    if (matches.length === 1) return { index: matches[0], slot: offered[matches[0]], reason: 'time' };
    if (matches.length > 1 && requestedWeekday !== null) {
      const idx = matches.find((i) => slotWeekday(offered[i]) === requestedWeekday);
      if (idx !== undefined) return { index: idx, slot: offered[idx], reason: 'weekday_time' };
    }
  }

  // 3. Ordinal selection ("the first one", "option 2", "last").
  const ord = firstOrdinal(t);
  if (ord !== null) {
    const idx = ord === -1 ? offered.length - 1 : ord;
    if (idx >= 0 && idx < offered.length) return { index: idx, slot: offered[idx], reason: 'ordinal' };
  }

  // 4. Weekday alone, unique among offers.
  if (requestedWeekday !== null) {
    const matches = offered.map((s, i) => (slotWeekday(s) === requestedWeekday ? i : -1)).filter((i) => i >= 0);
    if (matches.length === 1) return { index: matches[0], slot: offered[matches[0]], reason: 'weekday' };
  }

  // 5. Plain "yes" when only one slot was offered.
  if (offered.length === 1 && isAffirmative(t)) {
    return { index: 0, slot: offered[0], reason: 'single_affirmation' };
  }

  return null;
}

/** A natural confirmation line once a slot is booked. */
export function formatBookingConfirmation(slot: OpenSlot, businessName?: string | null): string {
  const who = businessName ? ` with ${businessName}` : '';
  return `You're all set for ${slot.label}${who}. I'll send a reminder beforehand — see you then!`;
}
