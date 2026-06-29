// Lead qualification / customer-detail capture — pure, dependency-free.
//
// Before the agent offers appointment times it collects the minimum it needs to
// book well: the customer's name, and which service they want when the provider
// offers more than one. This is the "collect customer details / qualify leads"
// step. Like the rest of the agent core it imports nothing so it is shared by
// the Edge runtime and vitest.

export interface ServiceLite {
  id: string;
  name: string;
  durationMinutes: number;
}

/** Details gathered about a prospective client, persisted on the thread. */
export interface Lead {
  name?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  /** Channel handle (phone/email/username) — captured automatically. */
  contact?: string | null;
}

export type QualificationStep =
  | { kind: 'ask_name'; prompt: string }
  | { kind: 'ask_service'; prompt: string }
  | { kind: 'ready' };

const STOP_NAME_WORDS = new Set([
  'interested', 'looking', 'wondering', 'available', 'free', 'booking', 'appointment',
  'here', 'there', 'just', 'really', 'actually', 'not', 'sure', 'good', 'great', 'fine',
  'ok', 'okay', 'yes', 'no', 'thanks', 'thank', 'hello', 'hi', 'hey',
  // prepositions / articles that can trail an introduction verb
  'in', 'on', 'at', 'to', 'the', 'a', 'an', 'for', 'with', 'of', 'about', 'and',
]);

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/**
 * Pull a name out of a self-introduction ("my name is Sara", "I'm Jane Doe",
 * "this is Alex"). Returns a title-cased 1–2 word name, or null.
 */
export function parseName(text: string): string | null {
  const m = /\b(?:my name is|i am|i'm|im|this is|it'?s|name'?s)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+)?)/i.exec(
    text || '',
  );
  if (!m) return null;
  const words = m[1].trim().split(/\s+/).filter((w) => !STOP_NAME_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return null;
  return titleCase(words.slice(0, 2).join(' '));
}

/**
 * Treat a short bare reply as a name when we explicitly asked for one
 * ("Sara", "Sara Lee"). Rejects sentences, digits, and filler words.
 */
export function parseNameWhenAsked(text: string): string | null {
  const explicit = parseName(text);
  if (explicit) return explicit;
  const cleaned = (text || '').trim().replace(/[^a-zA-Z'\s-]/g, '').trim();
  if (!cleaned) return null;
  const words = cleaned.split(/\s+/);
  if (words.length > 3) return null;
  if (words.some((w) => w.length < 2 || STOP_NAME_WORDS.has(w.toLowerCase()))) return null;
  return titleCase(words.slice(0, 2).join(' '));
}

function tokens(s: string): string[] {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
}

/** Match the client's text to one of the provider's services by name overlap. */
export function matchService(text: string, services: ServiceLite[]): ServiceLite | null {
  if (services.length === 0) return null;
  const msg = ` ${(text || '').toLowerCase()} `;
  const msgTokens = new Set(tokens(text));
  let best: { svc: ServiceLite; score: number } | null = null;

  for (const svc of services) {
    const nameLower = svc.name.toLowerCase();
    let score = 0;
    if (nameLower && msg.includes(` ${nameLower} `)) score = 1; // full name appears
    else {
      const nameTokens = tokens(svc.name);
      if (nameTokens.length) {
        let hit = 0;
        for (const t of nameTokens) if (msgTokens.has(t)) hit++;
        score = hit / nameTokens.length;
      }
    }
    if (score >= 0.5 && (!best || score > best.score)) best = { svc, score };
  }
  return best?.svc ?? null;
}

function serviceListPrompt(services: ServiceLite[]): string {
  const names = services.map((s) => s.name);
  const list = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
  return `Happy to help you book! Which service are you interested in — ${list}?`;
}

/**
 * What to do next given what we know. Asks for a service first (only when there
 * is real choice), then a name, then signals we have enough to offer times.
 */
export function nextQualificationStep(lead: Lead, services: ServiceLite[]): QualificationStep {
  if (services.length > 1 && !lead.serviceId) {
    return { kind: 'ask_service', prompt: serviceListPrompt(services) };
  }
  if (!lead.name) {
    return { kind: 'ask_name', prompt: 'Great — and may I get your name for the booking?' };
  }
  return { kind: 'ready' };
}

/**
 * Fold any details found in the latest message into the lead. `expectingName`
 * lets a bare reply count as a name right after we asked for one.
 */
export function captureDetails(
  lead: Lead,
  text: string,
  services: ServiceLite[],
  expectingName: boolean,
): Lead {
  const next: Lead = { ...lead };
  if (!next.serviceId) {
    const svc = matchService(text, services);
    if (svc) {
      next.serviceId = svc.id;
      next.serviceName = svc.name;
    }
  }
  if (!next.name) {
    const name = expectingName ? parseNameWhenAsked(text) : parseName(text);
    if (name) next.name = name;
  }
  return next;
}
