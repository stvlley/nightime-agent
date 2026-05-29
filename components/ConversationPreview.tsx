import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { X, MessageSquare, Calendar, DollarSign, MapPin } from 'lucide-react-native';
import { ParsedConversation } from '@/utils/chatParsers';

interface ConversationPreviewProps {
  conversation: ParsedConversation;
  insights: any;
  visible: boolean;
  onClose: () => void;
}

export default function ConversationPreview({ 
  conversation, 
  insights, 
  visible, 
  onClose 
}: ConversationPreviewProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'insights'>('messages');

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const renderInsightSection = (title: string, items: string[], icon: any) => {
    const IconComponent = icon;
    if (items.length === 0) return null;

    return (
      <View style={styles.insightSection}>
        <View style={styles.insightHeader}>
          <IconComponent size={16} color="#4f46e5" />
          <Text style={styles.insightTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{items.length}</Text>
          </View>
        </View>
        {items.slice(0, 3).map((item, index) => (
          <Text key={index} style={styles.insightItem}>
            • {item.length > 100 ? `${item.substring(0, 100)}...` : item}
          </Text>
        ))}
        {items.length > 3 && (
          <Text style={styles.moreItems}>
            +{items.length - 3} more items
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Conversation Preview</Text>
            <Text style={styles.subtitle}>
              {conversation.clientName} • {conversation.platform}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
            onPress={() => setActiveTab('messages')}
          >
            <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
              Messages ({conversation.totalMessages})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
            onPress={() => setActiveTab('insights')}
          >
            <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>
              AI Insights
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'messages' ? (
            <View style={styles.messagesContainer}>
              {conversation.messages.slice(0, 20).map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    message.isFromClient ? styles.clientMessage : styles.businessMessage
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <Text style={styles.senderName}>{message.sender}</Text>
                    <Text style={styles.messageTime}>
                      {formatTimestamp(message.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.messageText}>{message.message}</Text>
                </View>
              ))}
              {conversation.messages.length > 20 && (
                <View style={styles.moreMessagesCard}>
                  <Text style={styles.moreMessagesText}>
                    +{conversation.messages.length - 20} more messages
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.insightsContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Training Summary</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{conversation.totalMessages}</Text>
                    <Text style={styles.summaryLabel}>Total Messages</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {conversation.messages.filter(m => m.isFromClient).length}
                    </Text>
                    <Text style={styles.summaryLabel}>Client Messages</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {conversation.messages.filter(m => !m.isFromClient).length}
                    </Text>
                    <Text style={styles.summaryLabel}>Your Responses</Text>
                  </View>
                </View>
              </View>

              {renderInsightSection(
                'Common Questions',
                insights.commonQuestions,
                MessageSquare
              )}
              
              {renderInsightSection(
                'Booking Requests',
                insights.bookingPatterns,
                Calendar
              )}
              
              {renderInsightSection(
                'Service Inquiries',
                insights.serviceInquiries,
                MapPin
              )}
              
              {renderInsightSection(
                'Pricing Questions',
                insights.pricingQuestions,
                DollarSign
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4f46e5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#4f46e5',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageBubble: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clientMessage: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  businessMessage: {
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  moreMessagesCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  moreMessagesText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  insightsContainer: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4f46e5',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  insightSection: {
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  insightItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  moreItems: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
