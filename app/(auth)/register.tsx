import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Button, Field, Surface, Text, XStack, YStack, colors } from '@/components/ui';
import { onboardingUtils } from '@/utils/onboarding';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { signUp, loading } = useAuth();

  const handleRegister = async () => {
    if (!formData.businessName || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const result = await signUp(
      formData.email.trim(),
      formData.password,
      formData.businessName.trim()
    );

    if (!result.success) {
      Alert.alert('Registration failed', result.error ?? 'Unable to create account');
      return;
    }

    await onboardingUtils.resetOnboardingCompletion();
    await onboardingUtils.setUserLoggedIn(true);
    router.replace('/(onboarding)/onboarding');
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <YStack gap={22} style={styles.inner}>
          <YStack gap={8} alignItems="center">
            <Text fontSize={34} fontWeight="800" color={colors.text} textAlign="center" variant="display">
              Create Account
            </Text>
            <Text fontSize={16} color={colors.textSecondary} textAlign="center">
              Start automating your business
            </Text>
          </YStack>

          <Surface style={styles.form}>
            <YStack gap={16}>
              <Field
                label="Business Name"
                value={formData.businessName}
                onChangeText={(value) => updateFormData('businessName', value)}
                placeholder="Enter your business name"
              />
              <Field
                label="Email"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="Password"
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                placeholder="Create a password"
                secureTextEntry
              />
              <Field
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                placeholder="Confirm your password"
                secureTextEntry
              />

              <Button onPress={handleRegister} loading={loading} disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <XStack justifyContent="center" alignItems="center" gap={4} flexWrap="wrap">
                <Text fontSize={14} color={colors.textSecondary}>
                  Already have an account?
                </Text>
                <Link href="/" asChild>
                  <Pressable accessibilityRole="link">
                    <Text fontSize={14} fontWeight="800" color={colors.primaryActive}>
                      Sign In
                    </Text>
                  </Pressable>
                </Link>
              </XStack>
            </YStack>
          </Surface>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  inner: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  form: {
    padding: 24,
  },
});
