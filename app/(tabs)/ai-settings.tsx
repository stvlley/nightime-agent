import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, Plus, Trash2, Shield } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { faqService, FaqItem } from '@/lib/data';

// Demo-mode fallback (no Supabase env): keeps the public web demo populated.
const DEMO_FAQS: FaqItem[] = [
  { id: '1', trigger: 'What are your rates?', reply: 'Our rates are: 60 min - $80, 90 min - $120. Would you like to book a session?', enabled: true },
  { id: '2', trigger: 'What services do you offer?', reply: 'We offer Swedish, Deep Tissue, Sports, and Hot Stone. Each session is customized to your needs.', enabled: true },
  { id: '3', trigger: 'How do I book?', reply: "Just reply with your preferred time and date. I'll check availability and confirm.", enabled: true },
];

export default function AISettingsScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [moderationLevel, setModerationLevel] = useState('Medium');
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [faqs, setFaqs] = useState<FaqItem[]>(isSupabaseConfigured ? [] : DEMO_FAQS);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    setLoading(true);
    faqService
      .list(user.id)
      .then((rows) => {
        if (active) setFaqs(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, isSupabaseConfigured]);

  const moderationLevels = ['Low', 'Medium', 'Strict'];

  const handleAddFAQ = async () => {
    if (!newTrigger || !newResponse) {
      Alert.alert('Error', 'Please fill in both trigger and response');
      return;
    }

    // Demo mode: keep it local only.
    if (!isSupabaseConfigured || !user) {
      setFaqs([
        ...faqs,
        { id: Date.now().toString(), trigger: newTrigger, reply: newResponse, enabled: true },
      ]);
      setNewTrigger('');
      setNewResponse('');
      setShowAddForm(false);
      return;
    }

    setSaving(true);
    try {
      const created = await faqService.create(user.id, newTrigger, newResponse);
      setFaqs([...faqs, created]);
      setNewTrigger('');
      setNewResponse('');
      setShowAddForm(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = (id: string) => {
    Alert.alert('Delete FAQ', 'Are you sure you want to delete this FAQ?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const prev = faqs;
          setFaqs(faqs.filter((faq) => faq.id !== id)); // optimistic
          if (isSupabaseConfigured) {
            try {
              await faqService.remove(id);
            } catch (e: any) {
              setFaqs(prev); // rollback
              Alert.alert('Could not delete', e?.message ?? 'Failed to delete FAQ');
            }
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Settings</Text>
        <Text style={styles.subtitle}>Configure your AI assistant</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingInfo}>
                <Bot size={24} color="#8b5cf6" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>AI Assistant</Text>
                  <Text style={styles.settingDescription}>
                    Enable automatic responses to client messages
                  </Text>
                </View>
              </View>
              <Switch
                value={aiEnabled}
                onValueChange={setAiEnabled}
                trackColor={{ false: '#e5e7eb', true: '#ddd6fe' }}
                thumbColor={aiEnabled ? '#8b5cf6' : '#f3f4f6'}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingInfo}>
                <Shield size={24} color="#f59e0b" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Content Moderation</Text>
                  <Text style={styles.settingDescription}>
                    Filter inappropriate content before AI processing
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.moderationLevels}>
              {moderationLevels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.moderationButton,
                    moderationLevel === level && styles.moderationButtonActive
                  ]}
                  onPress={() => setModerationLevel(level)}
                >
                  <Text style={[
                    styles.moderationButtonText,
                    moderationLevel === level && styles.moderationButtonTextActive
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAQ Responses</Text>
            <TouchableOpacity 
              style={styles.addFaqButton}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <Plus size={20} color="#4f46e5" />
              <Text style={styles.addFaqButtonText}>Add FAQ</Text>
            </TouchableOpacity>
          </View>

          {showAddForm && (
            <View style={styles.addForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Trigger Phrase</Text>
                <TextInput
                  style={styles.input}
                  value={newTrigger}
                  onChangeText={setNewTrigger}
                  placeholder="e.g., What are your rates?"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>AI Response</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newResponse}
                  onChangeText={setNewResponse}
                  placeholder="Enter the AI response..."
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={handleAddFAQ}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Add FAQ'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator style={styles.loader} color="#4f46e5" />
          ) : faqs.length === 0 ? (
            <Text style={styles.emptyText}>No FAQs yet. Add one above.</Text>
          ) : (
            faqs.map((faq) => (
            <View key={faq.id} style={[styles.faqCard, !faq.enabled && styles.faqCardDisabled]}>
              <View style={styles.faqHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{faq.enabled ? 'ACTIVE' : 'OFF'}</Text>
                </View>
                <View style={styles.faqActions}>
                  <TouchableOpacity
                    style={styles.faqActionButton}
                    onPress={() => handleDeleteFAQ(faq.id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.faqTrigger}>{faq.trigger}</Text>
              <Text style={styles.faqResponse}>{faq.reply}</Text>
            </View>
            ))
          )}
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
  settingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  moderationLevels: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  moderationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  moderationButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  moderationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  moderationButtonTextActive: {
    color: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  addFaqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addFaqButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  addForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  faqCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqCardDisabled: {
    opacity: 0.55,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 15,
    paddingVertical: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  faqActions: {
    flexDirection: 'row',
    gap: 8,
  },
  faqActionButton: {
    padding: 4,
  },
  faqTrigger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  faqResponse: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});