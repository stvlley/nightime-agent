// Cost-effective auto-translation for non-English clients (IO, Deno).
//
// Engine precedence (first available wins):
//   1. Google Cloud Translation v2  — GOOGLE_TRANSLATE_API_KEY. Cheapest quality
//      engine (~$20 / 1M chars) and returns the detected source language in the
//      same call, so one request both detects and translates.
//   2. Anthropic (Claude Haiku)     — ANTHROPIC_API_KEY. Reuses the model the
//      agent already uses; returns JSON {detected, translation}.
//   3. Passthrough                  — no engine configured: returns the text
//      unchanged with detectedLang 'und' so callers cleanly skip translation.
//
// Design note: we translate INBOUND → English before the FAQ/agent logic (so
// matching + the model work for any language) and the provider's English reply →
// the client's language at delivery. The provider always reads/approves English.

export const DEFAULT_LANG = 'en';

export interface TranslateResult {
  text: string;
  /** ISO code of the source language Google/LLM detected (e.g. 'es'); 'und' if unknown. */
  detectedLang: string;
  engine: 'google' | 'anthropic' | 'none';
}

/** True when a detected language means we should treat the message as non-English. */
export function isTranslatable(lang: string | null | undefined): boolean {
  if (!lang) return false;
  const l = lang.toLowerCase();
  return l !== 'en' && l !== 'und' && !l.startsWith('en-');
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
  it: 'Italian', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', pl: 'Polish', nl: 'Dutch',
  vi: 'Vietnamese', th: 'Thai', uk: 'Ukrainian', ro: 'Romanian', tl: 'Tagalog',
};

export function languageName(code: string): string {
  return LANG_NAMES[code.toLowerCase()] ?? code;
}

async function googleTranslate(text: string, target: string, key: string): Promise<TranslateResult> {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: text, target, format: 'text' }),
  });
  if (!res.ok) throw new Error(`google translate ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const t = data?.data?.translations?.[0];
  return {
    text: typeof t?.translatedText === 'string' ? t.translatedText : text,
    detectedLang: t?.detectedSourceLanguage ?? 'und',
    engine: 'google',
  };
}

async function anthropicTranslate(text: string, target: string, key: string): Promise<TranslateResult> {
  const model = Deno.env.get('AGENT_MODEL') ?? 'claude-haiku-4-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system:
        `Translate the user's message into ${languageName(target)}. ` +
        `Detect the source language. Respond with ONLY minified JSON: ` +
        `{"detected":"<iso-639-1>","translation":"<translated text>"}. No prose, no code fences.`,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data?.content?.[0]?.text;
  try {
    const parsed = JSON.parse(String(raw));
    return {
      text: typeof parsed.translation === 'string' ? parsed.translation : text,
      detectedLang: typeof parsed.detected === 'string' ? parsed.detected : 'und',
      engine: 'anthropic',
    };
  } catch {
    // If the model didn't return clean JSON, treat its whole output as the translation.
    return { text: typeof raw === 'string' ? raw.trim() : text, detectedLang: 'und', engine: 'anthropic' };
  }
}

/**
 * Translate `text` into `target`. Never throws — on any engine error it returns
 * the original text with engine 'none' so the agent loop degrades gracefully.
 */
export async function translateText(text: string, target: string): Promise<TranslateResult> {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { text, detectedLang: 'und', engine: 'none' };

  const googleKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  try {
    if (googleKey) return await googleTranslate(trimmed, target, googleKey);
    if (anthropicKey) return await anthropicTranslate(trimmed, target, anthropicKey);
  } catch (_e) {
    // fall through to passthrough
  }
  return { text, detectedLang: 'und', engine: 'none' };
}
