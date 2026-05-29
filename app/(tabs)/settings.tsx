import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Shield, CircleHelp as HelpCircle, LogOut, ChevronRight, Smartphone, Clock, Volume2, LucideIcon } from 'lucide-react-native';
import { router } from 'expo-router';

type SettingItem =
  | {
      label: string;
      icon: LucideIcon;
      action: () => void;
      toggle?: false;
    }
  | {
      label: string;
      icon: LucideIcon;
      toggle: true;
      value: boolean;
      onToggle: (value: boolean) => void;
    };

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceCallsEnabled, setVoiceCallsEnabled] = useState(true);
  const [autoFollowUp, setAutoFollowUp] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: () => router.replace('/(auth)/login') },
      ]
    );
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          label: 'Profile Information',
          icon: User,
          action: () => Alert.alert('Profile', 'Profile editing coming soon'),
        },
        {
          label: 'Business Details',
          icon: Smartphone,
          action: () => Alert.alert('Business', 'Business settings coming soon'),
        },
      ],
    },
    {
      title: 'Automation',
      items: [
        {
          label: 'Push Notifications',
          icon: Bell,
          toggle: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          label: 'Voice Call Handling',
          icon: Volume2,
          toggle: true,
          value: voiceCallsEnabled,
          onToggle: setVoiceCallsEnabled,
        },
        {
          label: 'Auto Follow-up',
          icon: Clock,
          toggle: true,
          value: autoFollowUp,
          onToggle: setAutoFollowUp,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          label: 'Privacy Policy',
          icon: Shield,
          action: () => Alert.alert('Privacy', 'Privacy policy coming soon'),
        },
        {
          label: 'Help Center',
          icon: HelpCircle,
          action: () => Alert.alert('Help', 'Help center coming soon'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your app experience</Text>
      </View>

      <ScrollView style={styles.content}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.settingItem}
                  onPress={item.toggle ? undefined : item.action}
                  disabled={item.toggle}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <IconComponent size={20} color="#6b7280" />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#e5e7eb', true: '#ddd6fe' }}
                      thumbColor={item.value ? '#8b5cf6' : '#f3f4f6'}
                    />
                  ) : (
                    <ChevronRight size={20} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2024 TherapyBot AI</Text>
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
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});
