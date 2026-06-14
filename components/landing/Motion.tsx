import React from 'react';
import { View, type ViewStyle } from 'react-native';

// Motion primitives — currently static no-ops.
//
// The earlier react-native-reanimated implementation crashed on native
// ("Exception in HostFunction"): Reanimated 4 needs its worklets babel plugin,
// and this project has no babel.config.js wiring it up, so any Reanimated call
// throws at load. Since these components mount on the always-loaded landing
// page, that took the whole app down on device.
//
// Rather than depend on Reanimated here, render statically everywhere. If we
// want landing motion back, do it the way NightSky already does it — web-only
// CSS animation gated by useCanAnimate() — which is proven in this app and
// never touches native worklets. The API below is kept stable so callers don't
// change.

type RevealProps = {
  children: React.ReactNode;
  enabled: boolean;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
};

type FloatProps = {
  children: React.ReactNode;
  enabled: boolean;
  amplitude?: number;
  duration?: number;
};

export function Reveal({ children, style }: RevealProps) {
  return <View style={style}>{children}</View>;
}

export function Float({ children }: FloatProps) {
  return <>{children}</>;
}
