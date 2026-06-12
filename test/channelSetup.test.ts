import { describe, expect, it } from 'vitest';
import {
  buildWebchatEmbed,
  buildWebchatLink,
  channelLabel,
  functionsBaseFromSupabaseUrl,
  isValidSlug,
  looksLikeTelegramToken,
  randomHexSecret,
  slugifyHandle,
} from '../utils/channelSetup';

describe('slugifyHandle', () => {
  it('derives a slug from an email local part', () => {
    expect(slugifyHandle('Test.Provider+x@nightime.local')).toBe('test-provider-x');
  });

  it('derives a slug from a business name', () => {
    expect(slugifyHandle('Luna Massage & Spa')).toBe('luna-massage-spa');
  });

  it('collapses runs of separators and trims edges', () => {
    expect(slugifyHandle('  --My  Shop--  ')).toBe('my-shop');
  });

  it('falls back to "provider" when nothing survives', () => {
    expect(slugifyHandle('@@@')).toBe('provider');
  });

  it('always produces a DB-valid slug', () => {
    for (const input of ['A', 'ünïcødé näme', '123', 'x_y_z', 'a@b.c']) {
      expect(isValidSlug(slugifyHandle(input))).toBe(true);
    }
  });
});

describe('isValidSlug', () => {
  it('accepts lowercase kebab-case', () => {
    expect(isValidSlug('luna-spa-2')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
  });

  it('rejects invalid shapes', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Upper')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
    expect(isValidSlug('double--dash')).toBe(false);
    expect(isValidSlug('space here')).toBe(false);
  });
});

describe('looksLikeTelegramToken', () => {
  it('accepts the BotFather token shape', () => {
    expect(looksLikeTelegramToken('123456789:AAFh29sk_d83-ZZdkw0Qllxyz1234567890Ab')).toBe(true);
  });

  it('tolerates surrounding whitespace', () => {
    expect(looksLikeTelegramToken(' 123456789:AAFh29sk_d83-ZZdkw0Qllxyz1234567890Ab ')).toBe(true);
  });

  it('rejects obvious paste mistakes', () => {
    expect(looksLikeTelegramToken('')).toBe(false);
    expect(looksLikeTelegramToken('not a token')).toBe(false);
    expect(looksLikeTelegramToken('123:short')).toBe(false);
    expect(looksLikeTelegramToken('AAFh29sk_d83ZZdkw0Qllxyz')).toBe(false);
  });
});

describe('randomHexSecret', () => {
  it('produces hex of the requested byte length', () => {
    const secret = randomHexSecret(24);
    expect(secret).toMatch(/^[0-9a-f]{48}$/);
  });

  it('produces distinct values', () => {
    expect(randomHexSecret()).not.toBe(randomHexSecret());
  });
});

describe('webchat link building', () => {
  const link = buildWebchatLink({
    widgetBase: 'https://nightime-agent.vercel.app/chat.html',
    slug: 'luna-spa',
    functionsBase: 'https://abc.supabase.co/functions/v1',
    anonKey: 'anon-key',
    brand: 'Luna Spa',
  });

  it('includes all widget params', () => {
    const url = new URL(link);
    expect(url.searchParams.get('slug')).toBe('luna-spa');
    expect(url.searchParams.get('base')).toBe('https://abc.supabase.co/functions/v1');
    expect(url.searchParams.get('key')).toBe('anon-key');
    expect(url.searchParams.get('brand')).toBe('Luna Spa');
  });

  it('omits empty optional params', () => {
    const bare = buildWebchatLink({
      widgetBase: 'https://x.test/chat.html',
      slug: 's',
      functionsBase: 'https://abc.supabase.co/functions/v1',
      anonKey: '',
    });
    const url = new URL(bare);
    expect(url.searchParams.has('key')).toBe(false);
    expect(url.searchParams.has('brand')).toBe(false);
  });

  it('builds an iframe embed around the link', () => {
    const embed = buildWebchatEmbed(link);
    expect(embed).toContain(`src="${link}"`);
    expect(embed).toContain('<iframe');
  });
});

describe('functionsBaseFromSupabaseUrl', () => {
  it('appends the functions path and strips trailing slash', () => {
    expect(functionsBaseFromSupabaseUrl('https://abc.supabase.co/')).toBe(
      'https://abc.supabase.co/functions/v1'
    );
  });
});

describe('channelLabel', () => {
  it('maps known channels and passes unknown through', () => {
    expect(channelLabel('gv')).toBe('Google Voice');
    expect(channelLabel('webchat')).toBe('Web chat');
    expect(channelLabel('carrier-pigeon')).toBe('carrier-pigeon');
  });
});
