import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { colors } from '@/components/ui';

type OwlMascotProps = {
  size?: number;
  glow?: boolean;
};

// Stylized night owl. ViewBox is 256x256, centered.
export function OwlMascot({ size = 200, glow = true }: OwlMascotProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      accessibilityLabel="Nightime Agent owl mascot"
    >
      <Defs>
        <LinearGradient id="owlBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.primaryActive} />
        </LinearGradient>
        <LinearGradient id="owlBelly" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity="0.95" />
          <Stop offset="1" stopColor={colors.accentDim} stopOpacity="0.95" />
        </LinearGradient>
        <RadialGradient id="owlGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={colors.accent} stopOpacity="0.35" />
          <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="eyeShine" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.7" stopColor={colors.accent} stopOpacity="0.85" />
          <Stop offset="1" stopColor={colors.primaryActive} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {glow ? <Circle cx="128" cy="128" r="120" fill="url(#owlGlow)" /> : null}

      {/* Ear tufts */}
      <Path d="M70 70 L86 38 L102 78 Z" fill="url(#owlBody)" />
      <Path d="M186 70 L170 38 L154 78 Z" fill="url(#owlBody)" />

      {/* Body (rounded egg) */}
      <Path
        d="M128 56
           C 80 56, 52 96, 52 144
           C 52 196, 86 226, 128 226
           C 170 226, 204 196, 204 144
           C 204 96, 176 56, 128 56 Z"
        fill="url(#owlBody)"
      />

      {/* Belly */}
      <Path
        d="M128 110
           C 100 110, 86 132, 86 162
           C 86 192, 104 214, 128 214
           C 152 214, 170 192, 170 162
           C 170 132, 156 110, 128 110 Z"
        fill="url(#owlBelly)"
        opacity="0.6"
      />

      {/* Face disk shadow ring */}
      <Ellipse cx="128" cy="120" rx="68" ry="56" fill={colors.surface} opacity="0.06" />

      {/* Eye sockets (large discs) */}
      <Circle cx="96" cy="120" r="28" fill={colors.surface} />
      <Circle cx="160" cy="120" r="28" fill={colors.surface} />

      {/* Eye outer rims */}
      <Circle cx="96" cy="120" r="28" fill="none" stroke={colors.accent} strokeWidth="3" />
      <Circle cx="160" cy="120" r="28" fill="none" stroke={colors.accent} strokeWidth="3" />

      {/* Eye shine */}
      <Circle cx="96" cy="120" r="20" fill="url(#eyeShine)" />
      <Circle cx="160" cy="120" r="20" fill="url(#eyeShine)" />

      {/* Pupils */}
      <Circle cx="100" cy="124" r="9" fill={colors.background} />
      <Circle cx="156" cy="124" r="9" fill={colors.background} />
      <Circle cx="103" cy="121" r="2.5" fill="#ffffff" />
      <Circle cx="159" cy="121" r="2.5" fill="#ffffff" />

      {/* Beak */}
      <Path d="M128 142 L120 158 L136 158 Z" fill={colors.accent} />

      {/* Wing tips (subtle curves on the sides) */}
      <Path
        d="M64 162 C 62 184, 74 200, 92 204 L 92 200 C 78 194, 70 180, 70 168 Z"
        fill={colors.primaryActive}
        opacity="0.85"
      />
      <Path
        d="M192 162 C 194 184, 182 200, 164 204 L 164 200 C 178 194, 186 180, 186 168 Z"
        fill={colors.primaryActive}
        opacity="0.85"
      />

      {/* Feet */}
      <G fill={colors.accent}>
        <Path d="M108 224 L100 234 L108 234 L108 230 L114 234 L114 224 Z" />
        <Path d="M148 224 L142 234 L148 234 L148 230 L154 234 L154 224 Z" />
      </G>
    </Svg>
  );
}
