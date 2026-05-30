import { createTamagui } from 'tamagui';
import { defaultConfig } from '@tamagui/config/v5';
import { colors } from '@/components/ui';

// Override the dark theme with our night palette so Tamagui-styled surfaces match
// the app-wide tokens in components/ui. defaultTheme is set to "dark" in
// app/_layout.tsx so this is the active theme.
const baseDark = defaultConfig.themes.dark;

const nightDark = {
  ...baseDark,
  background: colors.background,
  backgroundHover: colors.surface,
  backgroundPress: colors.surfaceMuted,
  backgroundFocus: colors.surfaceMuted,
  backgroundStrong: colors.surface,
  color: colors.text,
  colorHover: colors.text,
  colorPress: colors.textSecondary,
  colorFocus: colors.text,
  borderColor: colors.border,
  borderColorHover: colors.borderStrong,
  borderColorFocus: colors.primary,
  borderColorPress: colors.borderStrong,
  placeholderColor: colors.textMuted,
};

const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    dark: nightDark,
  },
});

export default config;

export type AppTamaguiConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}
