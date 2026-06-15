import React, { ComponentType, ReactNode } from 'react';
import {
  ActivityIndicator,
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

// Light app palette aligned with the conversion onboarding brand.
export const colors = {
  background: '#f5f6ff',
  surface: '#ffffff',
  surfaceMuted: '#f8f9ff',
  border: '#e8e8f6',
  borderStrong: '#d9d8ef',
  text: '#161334',
  textSecondary: '#5a5780',
  textMuted: '#9794b6',
  primary: '#7c5cff',
  primaryActive: '#6442f0',
  success: '#119e6b',
  successBg: '#e2f8ef',
  warning: '#c77a12',
  warningBg: '#fdf1dd',
  danger: '#e5484d',
  dangerBg: '#ffeff1',
  info: '#2676d9',
  infoBg: '#edf5ff',
  neutralBg: '#f4f1ff',
  accent: '#9a63ff',
  accentDim: '#d8d3ee',
  starGlow: 'rgba(124, 92, 255, 0.28)',
  onPrimary: '#ffffff',
};

export const spacing = {
  page: 20,
  section: 16,
  row: 12,
};

type IconComponent = ComponentType<LucideProps>;
type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneMap: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: colors.neutralBg, fg: colors.textSecondary, border: colors.border },
  primary: { bg: '#f0edff', fg: colors.primary, border: '#d8d0ff' },
  success: { bg: colors.successBg, fg: colors.success, border: '#bdeed9' },
  warning: { bg: colors.warningBg, fg: colors.warning, border: '#f5d9a8' },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: '#ffc8cf' },
  info: { bg: colors.infoBg, fg: colors.info, border: '#c9e0ff' },
};

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
  style,
}: {
  children?: ReactNode;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  color?: string;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  numberOfLines?: number;
  flex?: number;
  style?: TextProps['style'];
}) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize,
          fontWeight: fontWeight as any,
          color,
          textAlign,
          flex,
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
    <YStack gap={18} padding={padded ? spacing.page : 0} style={!scroll ? { flex: 1 } : undefined}>
      {children}
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <RNScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 28 }}
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
        <Text fontSize={28} fontWeight="700" color={colors.text}>
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
            <Text fontSize={16} fontWeight="700" color={colors.text}>
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
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [surfaceStyle, { opacity: pressed ? 0.86 : 1 }]}>
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

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        backgroundColor: variant === 'primary' && pressed ? colors.primaryActive : bg,
        borderColor,
        borderWidth: variant === 'ghost' ? 0 : 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
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
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
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
}: {
  label?: string;
} & Pick<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'multiline' | 'secureTextEntry' | 'keyboardType'>) {
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
        style={{
          minHeight: multiline ? 92 : 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.surface,
          color: colors.text,
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
        <Text fontSize={24} fontWeight="800" color={colors.text}>
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
      <XStack alignItems="center" gap={12}>
        {Icon ? (
          <XStack
            width={36}
            height={36}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            backgroundColor={colors.surfaceMuted}
          >
            <Icon size={18} color={colors.textSecondary} />
          </XStack>
        ) : null}
        <YStack flex={1} gap={4}>
          <XStack justifyContent="space-between" gap={12}>
            <Text flex={1} fontSize={15} fontWeight="700" color={colors.text}>
              {title}
            </Text>
            {meta ? (
              <Text fontSize={12} color={colors.textMuted}>
                {meta}
              </Text>
            ) : null}
          </XStack>
          {subtitle ? (
            <Text fontSize={13} color={colors.textSecondary} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {badge}
        </YStack>
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
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.accentDim }}
          thumbColor={value ? colors.primary : '#ffffff'}
        />
      </XStack>
    </Surface>
  );
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const c = toneMap[tone];
  const pct = `${Math.max(0, Math.min(value, 100))}%`;
  return (
    <View style={{ height: 8, backgroundColor: colors.surfaceMuted, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: pct as any, height: '100%', backgroundColor: c.fg, borderRadius: 4 }} />
    </View>
  );
}

export function LoadingState() {
  return (
    <Surface>
      <XStack alignItems="center" justifyContent="center" gap={10} paddingVertical={14}>
        <ActivityIndicator color={colors.primary} />
        <Text fontSize={14} color={colors.textSecondary}>
          Loading
        </Text>
      </XStack>
    </Surface>
  );
}
