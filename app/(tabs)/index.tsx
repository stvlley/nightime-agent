import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MessageSquare, 
  Calendar, 
  Bot, 
  TrendingUp, 
  Users, 
  Clock,
  Smartphone,
  Mail
} from 'lucide-react-native';

export default function HomeScreen() {
  const [aiEnabled, setAiEnabled] = useState(true);

  const stats = [
    { label: 'Messages Today', value: '47', icon: MessageSquare, color: '#10b981' },
    { label: 'Bookings This Week', value: '12', icon: Calendar, color: '#3b82f6' },
    { label: 'AI Responses', value: '31', icon: Bot, color: '#8b5cf6' },
    { label: 'Response Rate', value: '94%', icon: TrendingUp, color: '#f59e0b' },
  ];

  const connectedPlatforms = [
    { name: 'Google Voice', status: 'connected', icon: Smartphone },
    { name: 'WhatsApp', status: 'connected', icon: MessageSquare },
    { name: 'Email', status: 'connected', icon: Mail },
    { name: 'Telegram', status: 'disconnected', icon: MessageSquare },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning, Sarah!</Text>
          <Text style={styles.subtitle}>{"Here's your business overview"}</Text>
        </View>

        <View style={styles.aiToggleCard}>
          <View style={styles.aiToggleContent}>
            <View>
              <Text style={styles.aiToggleTitle}>AI Assistant</Text>
              <Text style={styles.aiToggleSubtitle}>
                {aiEnabled ? 'Auto-responding to clients' : 'Manual responses only'}
              </Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              trackColor={{ false: '#e5e7eb', true: '#ddd6fe' }}
              thumbColor={aiEnabled ? '#8b5cf6' : '#f3f4f6'}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{"Today's Stats"}</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                    <IconComponent size={24} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.platformsContainer}>
          <Text style={styles.sectionTitle}>Connected Platforms</Text>
          {connectedPlatforms.map((platform, index) => {
            const IconComponent = platform.icon;
            return (
              <View key={index} style={styles.platformCard}>
                <View style={styles.platformInfo}>
                  <View style={styles.platformIconContainer}>
                    <IconComponent size={20} color="#6b7280" />
                  </View>
                  <Text style={styles.platformName}>{platform.name}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: platform.status === 'connected' ? '#dcfce7' : '#fef3c7' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: platform.status === 'connected' ? '#16a34a' : '#d97706' }
                  ]}>
                    {platform.status === 'connected' ? 'Connected' : 'Setup Required'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Clock size={20} color="#4f46e5" />
            <Text style={styles.actionButtonText}>Set Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Users size={20} color="#4f46e5" />
            <Text style={styles.actionButtonText}>View Recent Clients</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  aiToggleCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  aiToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiToggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  aiToggleSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statsContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  platformsContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  platformCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
});
