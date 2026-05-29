import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Send, Bot, User, ThumbsUp, ThumbsDown, CreditCard as Edit } from 'lucide-react-native';

interface Message {
  id: string;
  text: string;
  sender: 'client' | 'therapist' | 'ai';
  timestamp: string;
  aiSuggestion?: string;
}

interface ChatPanelProps {
  clientName: string;
  onClose: () => void;
}

export default function ChatPanel({ clientName, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m looking to book a massage appointment for this week.',
      sender: 'client',
      timestamp: '10:30 AM',
    },
    {
      id: '2',
      text: 'Hello! I have availability this Thursday at 3 PM or Friday at 2 PM. Would either of those work for you?',
      sender: 'ai',
      timestamp: '10:32 AM',
      aiSuggestion: 'AI suggested this response based on your calendar availability.',
    },
    {
      id: '3',
      text: 'Thursday at 3 PM works perfectly! What should I expect for my first visit?',
      sender: 'client',
      timestamp: '10:35 AM',
    },
  ]);

  const [messageText, setMessageText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(
    'Great! For your first visit, please arrive 10 minutes early to fill out intake forms. Wear comfortable clothing and let me know about any areas of concern.'
  );

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'therapist',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
    setAiSuggestion('');
  };

  const handleUseAISuggestion = () => {
    setMessageText(aiSuggestion);
    setAiSuggestion('');
  };

  const handleAIFeedback = (positive: boolean) => {
    Alert.alert(
      'Feedback Recorded',
      `Thank you for the ${positive ? 'positive' : 'negative'} feedback. This helps improve AI responses.`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.clientName}>{clientName}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageWrapper}>
            <View style={[
              styles.messageBubble,
              message.sender === 'client' ? styles.clientMessage : styles.therapistMessage,
              message.sender === 'ai' && styles.aiMessage,
            ]}>
              <View style={styles.messageHeader}>
                {message.sender === 'ai' && <Bot size={16} color="#10b981" />}
                {message.sender === 'therapist' && <User size={16} color="#4f46e5" />}
                <Text style={styles.messageText}>{message.text}</Text>
              </View>
              <Text style={styles.timestamp}>{message.timestamp}</Text>
            </View>
            
            {message.aiSuggestion && (
              <View style={styles.aiSuggestionContainer}>
                <Text style={styles.aiSuggestionText}>{message.aiSuggestion}</Text>
                <View style={styles.aiActions}>
                  <TouchableOpacity 
                    style={styles.aiActionButton}
                    onPress={() => handleAIFeedback(true)}
                  >
                    <ThumbsUp size={16} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.aiActionButton}
                    onPress={() => handleAIFeedback(false)}
                  >
                    <ThumbsDown size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {aiSuggestion && (
        <View style={styles.suggestionPanel}>
          <View style={styles.suggestionHeader}>
            <Bot size={16} color="#8b5cf6" />
            <Text style={styles.suggestionTitle}>AI Suggestion</Text>
          </View>
          <Text style={styles.suggestionText}>{aiSuggestion}</Text>
          <View style={styles.suggestionActions}>
            <TouchableOpacity 
              style={styles.useButton}
              onPress={handleUseAISuggestion}
            >
              <Text style={styles.useButtonText}>Use Suggestion</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setMessageText(aiSuggestion)}
            >
              <Edit size={16} color="#6b7280" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <Send size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  clientMessage: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
  },
  therapistMessage: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignSelf: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  aiSuggestionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  aiSuggestionText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  aiActions: {
    flexDirection: 'row',
    gap: 8,
  },
  aiActionButton: {
    padding: 4,
  },
  suggestionPanel: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  useButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  useButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  editButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4f46e5',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});