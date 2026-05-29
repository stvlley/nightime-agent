import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, Plus, CreditCard as Edit, Trash2, Shield } from 'lucide-react-native';

interface FAQ {
  id: string;
  trigger: string;
  response: string;
  category: string;
}

export default function AISettingsScreen() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [moderationLevel, setModerationLevel] = useState('Medium');
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      id: '1',
      trigger: 'What are your rates?',
      response: 'Our massage rates are: 60 min - $80, 90 min - $120. Would you like to book a session?',
      category: 'Pricing',
    },
    {
      id: '2',
      trigger: 'What services do you offer?',
      response: 'We offer Swedish, Deep Tissue, Sports, and Hot Stone massages. Each session is customized to your needs.',
      category: 'Services',
    },
    {
      id: '3',
      trigger: 'How do I book?',
      response: 'You can book by replying with your preferred time and date. I\'ll check availability and confirm your appointment.',
      category: 'Booking',
    },
  ]);

  const moderationLevels = ['Low', 'Medium', 'Strict'];

  const handleAddFAQ = () => {
    if (!newTrigger || !newResponse) {
      Alert.alert('Error', 'Please fill in both trigger and response');
      return;
    }

    const newFAQ: FAQ = {
      id: Date.now().toString(),
      trigger: newTrigger,
      response: newResponse,
      category: 'Custom',
    };

    setFaqs([...faqs, newFAQ]);
    setNewTrigger('');
    setNewResponse('');
    setShowAddForm(false);
  };

  const handleDeleteFAQ = (id: string) => {
    Alert.alert(
      'Delete FAQ',
      'Are you sure you want to delete this FAQ?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => setFaqs(faqs.filter(faq => faq.id !== id)) },
      ]
    );
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
                <TouchableOpacity style={styles.saveButton} onPress={handleAddFAQ}>
                  <Text style={styles.saveButtonText}>Add FAQ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {faqs.map((faq) => (
            <View key={faq.id} style={styles.faqCard}>
              <View style={styles.faqHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{faq.category}</Text>
                </View>
                <View style={styles.faqActions}>
                  <TouchableOpacity style={styles.faqActionButton}>
                    <Edit size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.faqActionButton}
                    onPress={() => handleDeleteFAQ(faq.id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.faqTrigger}>{faq.trigger}</Text>
              <Text style={styles.faqResponse}>{faq.response}</Text>
            </View>
          ))}
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