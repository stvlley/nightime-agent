import React from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { getSignupRoleCopy } from './content';
import { landingPalette, styles } from './styles';
import {
  LandingAuthMode,
  LandingSignupErrors,
  LandingSignupForm,
  LandingSignupRole,
} from './types';

type RoleSignupModalProps = {
  form: LandingSignupForm;
  errors: LandingSignupErrors;
  isNarrow: boolean;
  mode: LandingAuthMode;
  role: LandingSignupRole;
  signupComplete: boolean;
  submitting: boolean;
  visible: boolean;
  onClose: () => void;
  onFormChange: (field: keyof LandingSignupForm, value: string) => void;
  onGoogleAuth: () => void;
  onAppleAuth: () => void;
  onModeChange: (mode: LandingAuthMode) => void;
  onRoleChange: (role: LandingSignupRole) => void;
  onSubmit: () => void;
};

export function RoleSignupModal({
  form,
  errors,
  isNarrow,
  mode,
  role,
  signupComplete,
  submitting,
  visible,
  onClose,
  onFormChange,
  onGoogleAuth,
  onAppleAuth,
  onModeChange,
  onSubmit,
}: RoleSignupModalProps) {
  const roleCopy = getSignupRoleCopy(role);
  const isLogin = mode === 'login';
  const title = isLogin ? 'Log in' : roleCopy.title;
  const intro = isLogin
    ? 'Access your provider workspace, inbox, setup, and booking controls.'
    : roleCopy.intro;
  const action = isLogin ? 'Log in' : roleCopy.action;
  const showProviderAuth = isLogin || role === 'provider';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[styles.modalCard, isNarrow && styles.modalCardMobile]}
          accessibilityViewIsModal
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalIntro}>{intro}</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close signup"
            >
              <X size={18} color={landingPalette.bodyText} />
            </Pressable>
          </View>

          {isLogin ? (
            <View style={styles.segmented} accessibilityRole="tablist">
              {(['login', 'signup'] as LandingAuthMode[]).map((nextMode) => (
                <Pressable
                  key={nextMode}
                  style={[
                    styles.segment,
                    mode === nextMode && styles.segmentActive,
                  ]}
                  onPress={() => onModeChange(nextMode)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === nextMode }}
                  accessibilityLabel={
                    nextMode === 'login' ? 'Log in' : 'Create account'
                  }
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === nextMode && styles.segmentTextActive,
                    ]}
                  >
                    {nextMode === 'login' ? 'Log in' : 'Create account'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {signupComplete ? (
            <View style={styles.successBox}>
              <Check size={28} color={landingPalette.purpleAccent} />
              <Text style={styles.successTitle}>Client early access saved</Text>
              <Text style={styles.successText}>
                We saved your details. The full client portal signup flow opens
                after the provider launch.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              {showProviderAuth ? (
                <>
                  <Pressable
                    style={[
                      styles.googleAuthButton,
                      submitting && styles.disabledButton,
                    ]}
                    disabled={submitting}
                    onPress={onGoogleAuth}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                    accessibilityState={{ disabled: submitting }}
                  >
                    <Text style={styles.googleAuthIcon}>G</Text>
                    <Text style={styles.googleAuthLabel}>
                      {submitting
                        ? 'Opening Google...'
                        : 'Continue with Google'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.appleAuthButton,
                      submitting && styles.disabledButton,
                    ]}
                    disabled={submitting}
                    onPress={onAppleAuth}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                    accessibilityState={{ disabled: submitting }}
                  >
                    <Text style={styles.appleAuthIcon}></Text>
                    <Text style={styles.appleAuthLabel}>
                      {submitting ? 'Opening Apple...' : 'Continue with Apple'}
                    </Text>
                  </Pressable>
                  <View style={styles.authDivider}>
                    <View style={styles.authDividerLine} />
                    <Text style={styles.authDividerText}>or use email</Text>
                    <View style={styles.authDividerLine} />
                  </View>
                </>
              ) : null}
              {!isLogin ? (
                <LabeledInput
                  label={roleCopy.nameLabel}
                  placeholder={roleCopy.namePlaceholder}
                  value={form.displayName}
                  onChangeText={(value) => onFormChange('displayName', value)}
                  error={errors.displayName}
                  textContentType="name"
                />
              ) : null}
              <LabeledInput
                label="Email"
                placeholder="you@example.com"
                value={form.email}
                onChangeText={(value) => onFormChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={errors.email}
              />
              {isLogin || role === 'provider' ? (
                <LabeledInput
                  label="Password"
                  placeholder={
                    isLogin ? 'Enter your password' : 'At least 8 characters'
                  }
                  value={form.password}
                  onChangeText={(value) => onFormChange('password', value)}
                  secureTextEntry
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  textContentType={isLogin ? 'password' : 'newPassword'}
                  error={errors.password}
                />
              ) : null}
              {errors.submit ? (
                <Text style={styles.submitError}>{errors.submit}</Text>
              ) : null}
              <Pressable
                style={[
                  styles.modalAction,
                  submitting && styles.disabledButton,
                ]}
                disabled={submitting}
                onPress={onSubmit}
                accessibilityRole="button"
                accessibilityLabel={action}
                accessibilityState={{ disabled: submitting }}
              >
                <Text style={styles.modalActionLabel}>
                  {submitting ? 'Working...' : action}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function LabeledInput({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={landingPalette.textMuted}
        style={[styles.input, error && styles.inputError]}
        accessibilityLabel={label}
        accessibilityState={{ disabled: props.editable === false }}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
