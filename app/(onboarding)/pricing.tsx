import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Check, 
  Star, 
  Zap, 
  Clock,
  MessageSquare,
  TrendingUp,
  Users
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  features: string[];
  popular?: boolean;
  savings?: string;
}

export default function PricingScreen() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyPlans: PricingPlan[] = [
    {
      id: 'starter-monthly',
      name: 'Starter',
      price: '$29',
      period: '/month',
      features: [
        '100 AI responses/month',
        '2 connected platforms',
        'Basic booking calendar',
        'Email support',
        'SMS & WhatsApp integration'
      ]
    },
    {
      id: 'pro-monthly',
      name: 'Pro',
      price: '$79',
      period: '/month',
      features: [
        '1,000 AI responses/month',
        '5 connected platforms',
        'Advanced booking automation',
        'Voice call handling',
        'Priority support',
        'Custom AI training'
      ],
      popular: true
    }
  ];

  const yearlyPlans: PricingPlan[] = [
    {
      id: 'starter-yearly',
      name: 'Starter',
      price: '$24',
      originalPrice: '$29',
      period: '/month',
      features: [
        '100 AI responses/month',
        '2 connected platforms',
        'Basic booking calendar',
        'Email support',
        'SMS & WhatsApp integration'
      ],
      savings: 'Save $60/year'
    },
    {
      id: 'pro-yearly',
      name: 'Pro',
      price: '$65',
      originalPrice: '$79',
      period: '/month',
      features: [
        '1,000 AI responses/month',
        '5 connected platforms',
        'Advanced booking automation',
        'Voice call handling',
        'Priority support',
        'Custom AI training'
      ],
      popular: true,
      savings: 'Save $168/year'
    }
  ];

  const timeStats = [
    {
      icon: Clock,
      value: '3-5 hours',
      label: 'Saved per day',
      color: '#10b981'
    },
    {
      icon: MessageSquare,
      value: '24/7',
      label: 'AI responses',
      color: '#3b82f6'
    },
    {
      icon: TrendingUp,
      value: '40%',
      label: 'More bookings',
      color: '#8b5cf6'
    },
    {
      icon: Users,
      value: '0',
      label: 'Missed clients',
      color: '#f59e0b'
    }
  ];

  const handleStartTrial = async () => {
    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      
      Alert.alert(
        'Welcome to TherapyBot AI! 🎉',
        'Your 30-day free trial has started. Connect your first platform to begin automating your bookings.',
        [
          {
            text: 'Let\'s Go!',
            onPress: () => router.replace('/(auth)/login')
          }
        ]
      );
    } catch (error) {
      console.error('Error starting trial:', error);
      router.replace('/(auth)/login');
    }
  };

  const plans = billingCycle === 'monthly' ? monthlyPlans : yearlyPlans;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.trialBadge}>
              <Star size={16} color="#f59e0b" />
              <Text style={styles.trialBadgeText}>30-Day FREE Trial</Text>
            </View>
            <Text style={styles.title}>Get Your Time Back</Text>
            <Text style={styles.subtitle}>
              Stop losing clients to slow responses. Start your free trial and see results in 24 hours.
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>{"What You'll Gain"}</Text>
            <View style={styles.statsGrid}>
              {timeStats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <View key={index} style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                      <IconComponent size={20} color={stat.color} />
                    </View>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'monthly' && styles.billingOptionActive
              ]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[
                styles.billingOptionText,
                billingCycle === 'monthly' && styles.billingOptionTextActive
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'yearly' && styles.billingOptionActive
              ]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[
                styles.billingOptionText,
                billingCycle === 'yearly' && styles.billingOptionTextActive
              ]}>
                Yearly
              </Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save 20%</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlan
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Zap size={12} color="white" />
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <View style={styles.priceRow}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                      {plan.originalPrice && (
                        <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
                      )}
                    </View>
                    {plan.savings && (
                      <Text style={styles.savingsLabel}>{plan.savings}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Check size={16} color="#10b981" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.trialInfo}>
            <Text style={styles.trialTitle}>🚀 Start Your Test Drive</Text>
            <Text style={styles.trialDescription}>
              • Connect your phone number in 2 minutes{'\n'}
              • Upload your chat history to train the AI{'\n'}
              • Watch as bookings start flowing in automatically{'\n'}
              • Cancel anytime, no questions asked
            </Text>
          </View>

          <TouchableOpacity style={styles.startTrialButton} onPress={handleStartTrial}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.startTrialGradient}
            >
              <Text style={styles.startTrialText}>Start FREE 30-Day Trial</Text>
              <Text style={styles.startTrialSubtext}>No credit card required</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.guarantee}>
            <Text style={styles.guaranteeText}>
              💰 Money-back guarantee • ⚡ Setup in under 5 minutes • 📞 24/7 support
            </Text>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 32,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  trialBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 21,
    alignItems: 'center',
    position: 'relative',
  },
  billingOptionActive: {
    backgroundColor: 'white',
  },
  billingOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  billingOptionTextActive: {
    color: '#667eea',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  plansContainer: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: '#f5576c',
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 24,
    right: 24,
    backgroundColor: '#f5576c',
    borderRadius: 20,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#667eea',
  },
  planPeriod: {
    fontSize: 16,
    color: '#6b7280',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  trialInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  trialTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  trialDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  startTrialButton: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startTrialGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  startTrialText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  startTrialSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  guarantee: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  guaranteeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
