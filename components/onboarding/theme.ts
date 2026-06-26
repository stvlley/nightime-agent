import { colors } from '@/components/ui';

// Conversion-flow theme aliases. Onboarding now uses the same warm paper +
// muted purple system as the rest of the app; keep this file as the scoped
// bridge for older onboarding helpers.

export const onb = {
  bg: colors.background,
  bgTint: colors.surfaceMuted,
  card: colors.surface,
  cardAlt: colors.surfaceMuted,

  ink: colors.text,
  inkSoft: colors.textSecondary,
  inkFaint: colors.textMuted,

  border: colors.border,
  borderStrong: colors.borderStrong,

  primary: colors.primary,
  primaryDeep: colors.primaryActive,
  onColor: colors.onPrimary,

  gradHero: [colors.surface, colors.surfaceMuted, colors.accentDim] as readonly [string, string, string],
  gradWarm: [colors.surface, colors.warningBg, colors.accentDim] as readonly [string, string, string],
  gradMint: [colors.surface, colors.infoBg] as readonly [string, string],
  gradCta: [colors.primary, colors.accent, colors.primaryActive] as readonly [string, string, string],
  gradSun: [colors.warningBg, colors.surfaceMuted] as readonly [string, string],

  swatches: [colors.primary, colors.info, colors.success, colors.warning, colors.danger, colors.accent] as const,

  gradWash: [colors.background, colors.surface, colors.surfaceMuted] as readonly [string, string, string],

  successInk: colors.success,
  successBg: colors.successBg,
  warnInk: colors.warning,
  warnBg: colors.warningBg,
  danger: colors.danger,

  shadow: 'rgba(33, 27, 24, 0.14)',
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
