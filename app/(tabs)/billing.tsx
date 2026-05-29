import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  CreditCard, 
  Check, 
  Star, 
} from 'lucide-react-native';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

export default function BillingScreen() {
  const [currentPlan, setCurrentPlan] = useState('starter');

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29/month',
      features: [
        '100 AI responses/month',
        '2 connected platforms',
        'Basic booking calendar',
        'Email support',
      ],
      current: currentPlan === 'starter',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$79/month',
      features: [
        '1,000 AI responses/month',
        '5 connected platforms',
        'Advanced booking automation',
        'Voice call handling',
        'Priority support',
      ],
      popular: true,
      current: currentPlan === 'pro',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$149/month',
      features: [
        'Unlimited AI responses',
        'All platforms supported',
        'Custom AI training',
        'Advanced analytics',
        'White-label options',
        '24/7 phone support',
      ],
      current: currentPlan === 'premium',
    },
  ];

  const usageStats = [
    { label: 'AI Responses Used', value: '67', limit: '100', color: '#10b981' },
    { label: 'Connected Platforms', value: '3', limit: '5', color: '#3b82f6' },
    { label: 'Bookings This Month', value: '45', limit: 'Unlimited', color: '#8b5cf6' },
  ];

  const handlePlanSelection = (planId: string) => {
    if (planId === currentPlan) return;
    
    setCurrentPlan(planId);
    // In real app, handle subscription change via Stripe/RevenueCat
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan & Billing</Text>
        <Text style={styles.subtitle}>Manage your subscription</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <Text style={styles.currentPlanTitle}>Current Plan</Text>
            <View style={styles.currentPlanBadge}>
              <Star size={16} color="#f59e0b" />
              <Text style={styles.currentPlanBadgeText}>
                {plans.find(p => p.current)?.name}
              </Text>
            </View>
          </View>
          <Text style={styles.currentPlanPrice}>
            {plans.find(p => p.current)?.price}
          </Text>
        </View>

        <View style={styles.usageSection}>
          <Text style={styles.sectionTitle}>Usage This Month</Text>
          {usageStats.map((stat, index) => (
            <View key={index} style={styles.usageCard}>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>{stat.label}</Text>
                <Text style={styles.usageValue}>
                  {stat.value} {stat.limit !== 'Unlimited' && `/ ${stat.limit}`}
                </Text>
              </View>
              <View style={styles.usageBarContainer}>
                <View style={styles.usageBar}>
                  <View 
                    style={[
                      styles.usageProgress,
                      { 
                        width: stat.limit === 'Unlimited' ? '20%' : `${(parseInt(stat.value) / parseInt(stat.limit)) * 100}%`,
                        backgroundColor: stat.color 
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                plan.current && styles.currentPlanCard,
                plan.popular && styles.popularPlan,
              ]}
              onPress={() => handlePlanSelection(plan.id)}
              disabled={plan.current}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
              
              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check size={16} color="#10b981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              {plan.current ? (
                <View style={styles.currentButton}>
                  <Text style={styles.currentButtonText}>Current Plan</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => handlePlanSelection(plan.id)}
                >
                  <Text style={styles.selectButtonText}>
                    {currentPlan === 'starter' ? 'Upgrade' : 'Select Plan'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.billingInfo}>
          <Text style={styles.sectionTitle}>Billing Information</Text>
          <View style={styles.billingCard}>
            <View style={styles.billingRow}>
              <CreditCard size={20} color="#6b7280" />
              <Text style={styles.billingText}>•••• •••• •••• 4242</Text>
              <TouchableOpacity>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.nextBilling}>Next billing: February 15, 2024</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  currentPlanCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  currentPlanBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  currentPlanPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  usageSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  usageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  usageBarContainer: {
    width: '100%',
  },
  usageBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
  },
  usageProgress: {
    height: '100%',
    borderRadius: 3,
  },
  plansSection: {
    margin: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#4f46e5',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4f46e5',
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  currentButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectButton: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  billingInfo: {
    margin: 16,
  },
  billingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  billingText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  nextBilling: {
    fontSize: 14,
    color: '#6b7280',
  },
});
