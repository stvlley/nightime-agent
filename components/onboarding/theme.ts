// Conversion-flow theme — a deliberate LIGHT, colorful, gradient-rich palette
// for the diagnostic onboarding + paywall. This is an intentional exception to
// the app-wide dark night theme: the persuasion surface should feel bright,
// energetic, and airy (vivid gradient panels, white floating cards, lots of
// color), while the provider workflow app (inbox/dashboard/settings) stays calm
// and dark. Keep this palette scoped to `app/(onboarding)/onboarding.tsx` and
// `pricing.tsx`; do not leak it into workflow screens.

export const onb = {
  // Light surfaces
  bg: '#f5f6ff',
  bgTint: '#eef0ff',
  card: '#ffffff',
  cardAlt: '#f8f9ff',

  // Ink (text on light)
  ink: '#161334',
  inkSoft: '#5a5780',
  inkFaint: '#9794b6',

  border: '#e8e8f6',
  borderStrong: '#d9d8ef',

  // Brand violet (kept) + on-color text
  primary: '#7c5cff',
  primaryDeep: '#6442f0',
  onColor: '#ffffff',

  // Rich multi-stop gradients — colorful but light-feeling.
  gradHero: ['#8d6bff', '#6f8dff', '#57c9ff'] as readonly [string, string, string], // violet→blue→sky
  gradWarm: ['#ff8fb6', '#c372ff', '#8d6bff'] as readonly [string, string, string], // pink→violet
  gradMint: ['#5fe3c4', '#57c9ff'] as readonly [string, string], // mint→sky
  gradCta: ['#7c5cff', '#9a63ff', '#c372ff'] as readonly [string, string, string], // violet→purple→pink
  gradSun: ['#ffd166', '#ff9f6b'] as readonly [string, string], // amber→coral

  // Colorful accents for answer rows / categories / icons.
  swatches: ['#7c5cff', '#3fa9ff', '#21c997', '#ffb43f', '#ff6f9c', '#9a63ff'] as const,

  // Soft pastel wash for marketing hero/footer backdrops (light, colorful).
  gradWash: ['#eef1ff', '#f4eaff', '#e9f7ff'] as readonly [string, string, string],

  // Semantics
  successInk: '#119e6b',
  successBg: '#e2f8ef',
  warnInk: '#c77a12',
  warnBg: '#fdf1dd',
  danger: '#e5484d',

  // Soft elevation (allowed in the conversion theme; workflow screens stay flat).
  shadow: 'rgba(74, 58, 140, 0.18)',
};

export type Swatch = (typeof onb.swatches)[number];

export function swatchFor(index: number): string {
  return onb.swatches[index % onb.swatches.length];
}

// A translucent tint of a swatch for selected/soft backgrounds.
export function tint(hex: string, alpha = 0.12): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
