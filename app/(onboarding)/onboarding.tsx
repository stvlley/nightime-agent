import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {
  MessageSquare, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: any;
  gradient: readonly [ColorValue, ColorValue, ...ColorValue[]];
  benefits: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'AI-Powered\nMessaging',
    description: 'Your personal AI assistant handles client inquiries 24/7 across all platforms',
    icon: MessageSquare,
    gradient: ['#667eea', '#764ba2'],
    benefits: [
      'Responds instantly to client messages',
      'Works on WhatsApp, SMS, Email, Telegram',
      'Learns your business tone and style'
    ]
  },
  {
    id: 2,
    title: 'Smart Booking\nAutomation',
    description: 'Automatically schedules appointments and manages your calendar seamlessly',
    icon: Calendar,
    gradient: ['#f093fb', '#f5576c'],
    benefits: [
      'Books appointments automatically',
      'Syncs with your Google Calendar',
      'Sends confirmation & reminders'
    ]
  },
  {
    id: 3,
    title: 'Gain Hours\nBack Daily',
    description: 'Focus on what you do best while AI handles the business communications',
    icon: Clock,
    gradient: ['#4facfe', '#00f2fe'],
    benefits: [
      'Save 3-5 hours per day',
      'Never miss potential clients',
      'Increase booking conversion by 40%'
    ]
  }
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      opacity.value = withTiming(0, { duration: 200 }, () => {
        translateX.value = withSpring(-width * (currentStep + 1));
        opacity.value = withTiming(1, { duration: 300 });
      });
      setCurrentStep(currentStep + 1);
    } else {
      router.replace('/(onboarding)/pricing');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      opacity.value = withTiming(0, { duration: 200 }, () => {
        translateX.value = withSpring(-width * (currentStep - 1));
        opacity.value = withTiming(1, { duration: 300 });
      });
      setCurrentStep(currentStep - 1);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  const skipOnboarding = () => {
    router.replace('/(onboarding)/pricing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={onboardingSteps[currentStep].gradient}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={skipOnboarding}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, animatedStyle]}>
          <View style={styles.stepContainer}>
            {onboardingSteps.map((step, index) => (
              <View key={step.id} style={styles.step}>
                <View style={styles.iconContainer}>
                  <step.icon size={80} color="white" />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{step.title}</Text>
                  <Text style={styles.description}>{step.description}</Text>
                  
                  <View style={styles.benefitsList}>
                    {step.benefits.map((benefit, benefitIndex) => (
                      <View key={benefitIndex} style={styles.benefitItem}>
                        <View style={styles.benefitDot} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {onboardingSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentStep && styles.paginationDotActive
                ]}
              />
            ))}
          </View>

          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
              onPress={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={24} color={currentStep === 0 ? '#999' : 'white'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={nextStep}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    width: width * 3,
    flexDirection: 'row',
  },
  stepContainer: {
    flexDirection: 'row',
    width: width * 3,
  },
  step: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsList: {
    alignSelf: 'stretch',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 16,
  },
  benefitText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationDotActive: {
    backgroundColor: 'white',
    width: 24,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
