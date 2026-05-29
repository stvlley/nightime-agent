import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bot, User, Calendar, Phone } from 'lucide-react-native';

interface Conversation {
  id: string;
  clientName: string;
  lastMessage: string;
  timestamp: string;
  type: 'ai' | 'manual' | 'booking' | 'voice';
  platform: 'whatsapp' | 'sms' | 'email' | 'telegram';
  unread: boolean;
}

export default function InboxScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const conversations: Conversation[] = [
    {
      id: '1',
      clientName: 'John Smith',
      lastMessage: 'Thank you for the session today, feeling much better!',
      timestamp: '2 min ago',
      type: 'manual',
      platform: 'whatsapp',
      unread: false,
    },
    {
      id: '2',
      clientName: 'Sarah Wilson',
      lastMessage: 'AI: Our next available slot is tomorrow at 3 PM.',
      timestamp: '15 min ago',
      type: 'ai',
      platform: 'sms',
      unread: true,
    },
    {
      id: '3',
      clientName: 'Mike Johnson',
      lastMessage: 'Booking confirmed for Thursday 2 PM',
      timestamp: '1 hour ago',
      type: 'booking',
      platform: 'email',
      unread: false,
    },
    {
      id: '4',
      clientName: 'Emma Davis',
      lastMessage: 'Voice call: Asking about availability this week',
      timestamp: '2 hours ago',
      type: 'voice',
      platform: 'sms',
      unread: true,
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return <Bot size={16} color="#10b981" />;
      case 'booking':
        return <Calendar size={16} color="#3b82f6" />;
      case 'voice':
        return <Phone size={16} color="#f59e0b" />;
      default:
        return <User size={16} color="#6b7280" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ai':
        return '#dcfce7';
      case 'booking':
        return '#dbeafe';
      case 'voice':
        return '#fef3c7';
      default:
        return '#f3f4f6';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ai':
        return 'AI';
      case 'booking':
        return 'BOOKING';
      case 'voice':
        return 'VOICE';
      default:
        return 'MANUAL';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.conversationList}>
        {filteredConversations.map((conversation) => (
          <TouchableOpacity
            key={conversation.id}
            style={[
              styles.conversationCard,
              conversation.unread && styles.unreadCard
            ]}
          >
            <View style={styles.conversationHeader}>
              <View style={styles.clientInfo}>
                <Text style={[
                  styles.clientName,
                  conversation.unread && styles.unreadText
                ]}>
                  {conversation.clientName}
                </Text>
                <View style={styles.badgeContainer}>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: getTypeColor(conversation.type) }
                  ]}>
                    {getTypeIcon(conversation.type)}
                    <Text style={styles.typeBadgeText}>
                      {getTypeText(conversation.type)}
                    </Text>
                  </View>
                  <Text style={styles.platform}>
                    {conversation.platform.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.timestamp}>{conversation.timestamp}</Text>
            </View>
            
            <Text style={styles.lastMessage} numberOfLines={2}>
              {conversation.lastMessage}
            </Text>
            
            {conversation.unread && <View style={styles.unreadIndicator} />}
          </TouchableOpacity>
        ))}
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
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  searchContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    paddingLeft: 48,
    fontSize: 16,
  },
  conversationList: {
    flex: 1,
    padding: 16,
  },
  conversationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  unreadText: {
    color: '#4f46e5',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  platform: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    alignSelf: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
  },
});