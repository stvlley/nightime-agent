import React, { ComponentType, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  Switch,
  Text as RNText,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LucideProps } from 'lucide-react-native';

// Warm paper palette shared by public, onboarding, auth, and provider surfaces.
export const colors = {
  background: '#f6f0e6',
  surface: '#fbf6ec',
  surfaceMuted: '#eee6d8',
  border: '#ddd2c0',
  borderStrong: '#cfc1ad',
  text: '#211b18',
  textSecondary: '#675d55',
  textMuted: '#8c8175',
  primary: '#7460d6',
  primaryActive: '#5f4cbd',
  success: '#197a52',
  successBg: '#e3f3e8',
  warning: '#9a6115',
  warningBg: '#f4e5c8',
  danger: '#b23b45',
  dangerBg: '#f3d9db',
  info: '#346e9d',
  infoBg: '#dceaf1',
  neutralBg: '#eee6d8',
  accent: '#8b76e6',
  accentDim: '#d7cdea',
  starGlow: 'rgba(139, 118, 230, 0.26)',
  onPrimary: '#ffffff',
};

export const fonts = {
  display: Platform.select({
    web: 'Georgia, "Times New Roman", serif',
    default: 'serif',
  }),
  rounded: Platform.select({
    web: 'ui-rounded, "SF Pro Rounded", "Avenir Next Rounded", "Nunito", system-ui, sans-serif',
    default: undefined,
  }),
};

export const spacing = {
  page: 20,
  section: 16,
  row: 12,
};

export const SCREEN_MIN_WIDTH = 0;
export const SCREEN_MAX_WIDTH = 960;

type IconComponent = ComponentType<LucideProps>;
type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type SkeletonAnimationValue = Animated.Value | Animated.AnimatedInterpolation<number>;

const SkeletonAnimationContext = React.createContext<SkeletonAnimationValue | null>(null);

const toneMap: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: colors.neutralBg, fg: colors.textSecondary, border: colors.border },
  primary: { bg: '#ece7fb', fg: colors.primaryActive, border: colors.accentDim },
  success: { bg: colors.successBg, fg: colors.success, border: '#bfdcc8' },
  warning: { bg: colors.warningBg, fg: colors.warning, border: '#dec38f' },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: '#dfb5ba' },
  info: { bg: colors.infoBg, fg: colors.info, border: '#b7d1df' },
};

function runHaptic(kind: 'selection' | 'success' | 'warning' | 'error' = 'selection') {
  const feedback =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : Haptics.notificationAsync(
          kind === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : kind === 'warning'
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Error
        );

  feedback.catch(() => {
    // Haptics are best-effort and may be unavailable on web/simulator.
  });
}

type StackProps = {
  children?: ReactNode;
  gap?: number;
  flex?: number;
  flexWrap?: ViewStyle['flexWrap'];
  alignItems?: ViewStyle['alignItems'];
  justifyContent?: ViewStyle['justifyContent'];
  minWidth?: number;
  width?: number | string;
  height?: number | string;
  padding?: number;
  paddingVertical?: number;
  paddingHorizontal?: number;
  marginTop?: number;
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  overflow?: ViewStyle['overflow'];
  style?: ViewStyle;
};

function stackStyle(direction: 'row' | 'column', props: StackProps): ViewStyle {
  return {
    flexDirection: direction,
    gap: props.gap,
    flex: props.flex,
    flexWrap: props.flexWrap,
    alignItems: props.alignItems,
    justifyContent: props.justifyContent,
    minWidth: props.minWidth,
    width: props.width as ViewStyle['width'],
    height: props.height as ViewStyle['height'],
    padding: props.padding,
    paddingVertical: props.paddingVertical,
    paddingHorizontal: props.paddingHorizontal,
    marginTop: props.marginTop,
    borderRadius: props.borderRadius,
    backgroundColor: props.backgroundColor,
    borderColor: props.borderColor,
    borderWidth: props.borderWidth,
    overflow: props.overflow,
    ...(props.style ?? {}),
  };
}

export function XStack(props: StackProps) {
  return <View style={stackStyle('row', props)}>{props.children}</View>;
}

export function YStack(props: StackProps) {
  return <View style={stackStyle('column', props)}>{props.children}</View>;
}

export function Text({
  children,
  fontSize = 14,
  fontWeight,
  color = colors.text,
  textAlign,
  numberOfLines,
  flex,
  variant,
  style,
}: {
  children?: ReactNode;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  color?: string;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  numberOfLines?: number;
  flex?: number;
  variant?: 'auto' | 'display' | 'rounded';
  style?: TextProps['style'];
}) {
  const resolvedVariant = variant ?? (fontSize >= 20 ? 'display' : 'rounded');

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize,
          fontWeight,
          color,
          textAlign,
          flex,
          fontFamily: resolvedVariant === 'display' ? fonts.display : fonts.rounded,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

export function toneForStatus(status: string): Tone {
  if (['connected', 'confirmed', 'completed', 'active', 'paid'].includes(status)) return 'success';
  if (['pending', 'tentative', 'setup', 'setup_required', 'processing'].includes(status)) return 'warning';
  if (['cancelled', 'no_show', 'error', 'failed', 'off'].includes(status)) return 'danger';
  if (['ai', 'booking', 'info'].includes(status)) return 'info';
  return 'neutral';
}

export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const content = (
    <YStack
      gap={18}
      padding={padded ? spacing.page : 0}
      style={{
        width: '100%',
        minWidth: SCREEN_MIN_WIDTH,
        maxWidth: SCREEN_MAX_WIDTH,
        alignSelf: 'center',
        ...(!scroll ? { flex: 1 } : {}),
      }}
    >
      {children}
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <RNScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </RNScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={16}>
      <YStack flex={1} gap={4}>
        <Text fontSize={28} fontWeight="700" color={colors.text} variant="display">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize={15} color={colors.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {action}
    </XStack>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <YStack gap={12}>
      {title || action ? (
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          {title ? (
            <Text fontSize={16} fontWeight="700" color={colors.text} variant="rounded">
              {title}
            </Text>
          ) : (
            <YStack />
          )}
          {action}
        </XStack>
      ) : null}
      {children}
    </YStack>
  );
}

export function Surface({
  children,
  tone = 'neutral',
  pressable = false,
  onPress,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  pressable?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const borderColor = tone === 'neutral' ? colors.border : toneMap[tone].border;
  const surfaceStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    ...style,
  };

  if (pressable) {
    const handlePress = () => {
      if (!onPress) return;
      runHaptic('selection');
      onPress();
    };

    return (
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [surfaceStyle, { opacity: pressed ? 0.86 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={surfaceStyle}>{children}</View>;
}

export function Button({
  children,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPress,
}: {
  children: ReactNode;
  icon?: IconComponent;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.surface
          : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.text;
  const borderColor = variant === 'secondary' ? colors.borderStrong : bg;
  const handlePress = () => {
    if (!onPress || disabled || loading) return;
    runHaptic(variant === 'danger' ? 'warning' : variant === 'primary' ? 'success' : 'selection');
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        backgroundColor: variant === 'primary' && pressed ? colors.primaryActive : bg,
        borderColor: variant === 'primary' ? colors.primary : borderColor,
        borderWidth: variant === 'ghost' ? 0 : 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 11,
        shadowColor: variant === 'primary' ? colors.primaryActive : 'transparent',
        shadowOpacity: variant === 'primary' ? 0.18 : 0,
        shadowRadius: variant === 'primary' ? 10 : 0,
        shadowOffset: { width: 0, height: 5 },
        elevation: variant === 'primary' ? 2 : 0,
      })}
    >
      <XStack alignItems="center" justifyContent="center" gap={8}>
        {loading ? <ActivityIndicator color={fg} size="small" /> : Icon ? <Icon size={17} color={fg} /> : null}
        <Text fontSize={14} fontWeight="700" color={fg}>
          {children}
        </Text>
      </XStack>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  label,
  tone = 'neutral',
  onPress,
}: {
  icon: IconComponent;
  label: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const colorsForTone = toneMap[tone];
  const handlePress = () => {
    if (!onPress) return;
    runHaptic(tone === 'danger' ? 'warning' : 'selection');
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colorsForTone.bg,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon size={18} color={colorsForTone.fg} />
    </Pressable>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const c = toneMap[tone];
  return (
    <XStack
      alignItems="center"
      backgroundColor={c.bg}
      borderColor={c.border}
      borderWidth={1}
      borderRadius={6}
      paddingHorizontal={8}
      paddingVertical={3}
      style={{ alignSelf: 'flex-start' }}
    >
      <Text fontSize={11} fontWeight="700" color={c.fg}>
        {children}
      </Text>
    </XStack>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label?: string;
} & Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'multiline' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize'
>) {
  return (
    <YStack gap={6}>
      {label ? (
        <Text fontSize={13} fontWeight="700" color={colors.textSecondary}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          minHeight: multiline ? 92 : 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.surface,
          color: colors.text,
          fontFamily: fonts.rounded,
          fontSize: 15,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </YStack>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Surface>
      <YStack gap={4} alignItems="center" paddingVertical={16}>
        <Text fontSize={15} fontWeight="700" color={colors.text}>
          {title}
        </Text>
        {message ? (
          <Text fontSize={13} color={colors.textSecondary} textAlign="center">
            {message}
          </Text>
        ) : null}
      </YStack>
    </Surface>
  );
}

export function StatBlock({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon?: IconComponent;
  tone?: Tone;
}) {
  const c = toneMap[tone];
  return (
    <Surface>
      <YStack gap={10}>
        {Icon ? <Icon size={20} color={c.fg} /> : null}
        <Text fontSize={24} fontWeight="800" color={colors.text} variant="display">
          {value}
        </Text>
        <Text fontSize={12} color={colors.textSecondary}>
          {label}
        </Text>
      </YStack>
    </Surface>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  icon: Icon,
  badge,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: IconComponent;
  badge?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Surface pressable={Boolean(onPress)} onPress={onPress}>
      <XStack alignItems="center" gap={14}>
        {Icon ? (
          <XStack
            width={44}
            height={44}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            backgroundColor={colors.surfaceMuted}
          >
            <Icon size={20} color={colors.textSecondary} />
          </XStack>
        ) : null}
        <YStack flex={1} gap={4}>
          <XStack justifyContent="space-between" gap={12}>
            <Text flex={1} fontSize={15} fontWeight="800" color={colors.text} numberOfLines={2}>
              {title}
            </Text>
            {meta ? (
              <Text fontSize={12} color={colors.textMuted} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </XStack>
          {subtitle ? (
            <Text fontSize={13} color={colors.textSecondary} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </YStack>
        {badge ? (
          <XStack
            minWidth={38}
            height={38}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            backgroundColor={onPress ? colors.neutralBg : 'transparent'}
            style={{ flexShrink: 0 }}
          >
            {badge}
          </XStack>
        ) : null}
      </XStack>
    </Surface>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconComponent;
}) {
  const handleValueChange = (nextValue: boolean) => {
    runHaptic('selection');
    onValueChange(nextValue);
  };

  return (
    <Surface>
      <XStack alignItems="center" gap={12}>
        {Icon ? <Icon size={20} color={colors.primary} /> : null}
        <YStack flex={1} gap={3}>
          <Text fontSize={15} fontWeight="700" color={colors.text}>
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize={13} color={colors.textSecondary}>
              {subtitle}
            </Text>
          ) : null}
        </YStack>
        <Switch
          value={value}
          onValueChange={handleValueChange}
          trackColor={{ false: colors.border, true: colors.accentDim }}
          thumbColor={value ? colors.primary : colors.surface}
        />
      </XStack>
    </Surface>
  );
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const c = toneMap[tone];
  const pct = `${Math.max(0, Math.min(value, 100))}%` as ViewStyle['width'];
  return (
    <View style={{ height: 8, backgroundColor: colors.surfaceMuted, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: pct, height: '100%', backgroundColor: c.fg, borderRadius: 4 }} />
    </View>
  );
}

function SkeletonGroup({ children }: { children: ReactNode }) {
  const shimmer = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <SkeletonAnimationContext.Provider value={shimmer}>
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: '100%' }}
      >
        {children}
      </View>
    </SkeletonAnimationContext.Provider>
  );
}

export function SkeletonBlock({
  width = '100%',
  height,
  borderRadius = 6,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const shimmer = React.useContext(SkeletonAnimationContext);
  const opacity = shimmer
    ? shimmer.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.88, 1, 0.88],
      })
    : 1;
  const shimmerTranslate = shimmer
    ? shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-140, 520],
      })
    : 0;

  return (
    <Animated.View
      accessible={false}
      style={[
        {
          width: width as ViewStyle['width'],
          height,
          borderRadius,
          backgroundColor: colors.borderStrong,
          opacity,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {shimmer ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '65%',
            minWidth: 96,
            opacity: 0.75,
            transform: [{ translateX: shimmerTranslate }],
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.62)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function LoadingState({
  variant = 'list',
  rows = 3,
}: {
  variant?: 'list' | 'card' | 'stats' | 'messages';
  rows?: number;
}) {
  if (variant === 'stats') {
    return (
      <SkeletonGroup>
        <XStack flexWrap="wrap" gap={12}>
          {Array.from({ length: rows }).map((_, index) => (
            <YStack key={index} flex={1} minWidth={150}>
              <Surface>
                <YStack gap={10}>
                  <SkeletonBlock width={22} height={22} borderRadius={11} />
                  <SkeletonBlock width={62} height={26} borderRadius={7} />
                  <SkeletonBlock width="72%" height={12} />
                </YStack>
              </Surface>
            </YStack>
          ))}
        </XStack>
      </SkeletonGroup>
    );
  }

  if (variant === 'messages') {
    return (
      <SkeletonGroup>
        <YStack gap={10}>
          {Array.from({ length: rows }).map((_, index) => {
            const outbound = index % 2 === 1;
            return (
              <XStack key={index} justifyContent={outbound ? 'flex-end' : 'flex-start'}>
                <YStack
                  gap={8}
                  padding={12}
                  borderRadius={8}
                  borderWidth={1}
                  borderColor={colors.border}
                  backgroundColor={colors.surface}
                  style={{ width: outbound ? '68%' : '78%', maxWidth: '85%' }}
                >
                  <SkeletonBlock width="92%" height={13} />
                  <SkeletonBlock width={outbound ? '64%' : '76%'} height={13} />
                  <SkeletonBlock width={70} height={10} />
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      </SkeletonGroup>
    );
  }

  if (variant === 'card') {
    return (
      <SkeletonGroup>
        <YStack gap={10}>
          {Array.from({ length: rows }).map((_, index) => (
            <Surface key={index}>
              <YStack gap={12}>
                <XStack alignItems="center" gap={12}>
                  <SkeletonBlock width={40} height={40} borderRadius={8} />
                  <YStack flex={1} gap={7}>
                    <SkeletonBlock width="58%" height={14} />
                    <SkeletonBlock width="84%" height={12} />
                  </YStack>
                </XStack>
                <SkeletonBlock width="100%" height={index % 2 === 0 ? 82 : 54} borderRadius={8} />
                <XStack gap={8}>
                  <SkeletonBlock width={130} height={38} borderRadius={8} />
                  <SkeletonBlock width={82} height={38} borderRadius={8} />
                </XStack>
              </YStack>
            </Surface>
          ))}
        </YStack>
      </SkeletonGroup>
    );
  }

  return (
    <SkeletonGroup>
      <YStack gap={10}>
        {Array.from({ length: rows }).map((_, index) => (
          <Surface key={index}>
            <XStack alignItems="center" gap={14}>
              <SkeletonBlock width={44} height={44} borderRadius={8} />
              <YStack flex={1} gap={8}>
                <SkeletonBlock width={index % 2 === 0 ? '48%' : '62%'} height={14} />
                <SkeletonBlock width="88%" height={12} />
              </YStack>
              <SkeletonBlock width={54} height={22} borderRadius={6} />
            </XStack>
          </Surface>
        ))}
      </YStack>
    </SkeletonGroup>
  );
}
