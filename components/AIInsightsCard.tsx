import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Brain, TrendingUp, MessageSquare, Calendar, Target } from 'lucide-react-native';

interface AIInsightsCardProps {
  totalConversations: number;
  totalMessages: number;
  confidenceScore: number;
  platformBreakdown: Record<string, number>;
  onViewDetails: () => void;
}

export default function AIInsightsCard({
  totalConversations,
  totalMessages,
  confidenceScore,
  platformBreakdown,
  onViewDetails,
}: AIInsightsCardProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Brain size={24} color="#8b5cf6" />
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Learning Progress</Text>
            <Text style={styles.subtitle}>
              Training quality: {getConfidenceText(confidenceScore)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.detailsButton} onPress={onViewDetails}>
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MessageSquare size={16} color="#3b82f6" />
          <Text style={styles.statValue}>{totalMessages.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        
        <View style={styles.statItem}>
          <Calendar size={16} color="#10b981" />
          <Text style={styles.statValue}>{totalConversations}</Text>
          <Text style={styles.statLabel}>Conversations</Text>
        </View>
        
        <View style={styles.statItem}>
          <Target size={16} color={getConfidenceColor(confidenceScore)} />
          <Text style={[styles.statValue, { color: getConfidenceColor(confidenceScore) }]}>
            {Math.round(confidenceScore * 100)}%
          </Text>
          <Text style={styles.statLabel}>Confidence</Text>
        </View>
      </View>

      <View style={styles.platformsContainer}>
        <Text style={styles.platformsTitle}>Platforms Trained</Text>
        <View style={styles.platformsList}>
          {Object.entries(platformBreakdown).map(([platform, count]) => (
            <View key={platform} style={styles.platformChip}>
              <Text style={styles.platformChipText}>
                {platform} ({count})
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <TrendingUp size={16} color="#8b5cf6" />
          <Text style={styles.progressTitle}>Training Progress</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { 
              width: `${Math.min(confidenceScore * 100, 100)}%`,
              backgroundColor: getConfidenceColor(confidenceScore),
            }
          ]} />
        </View>
        <Text style={styles.progressText}>
          {confidenceScore < 0.6 
            ? 'Upload more conversations to improve AI responses'
            : confidenceScore < 0.8
            ? 'Good progress! Add more data for better accuracy'
            : 'Excellent! Your AI is well-trained'
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  platformsContainer: {
    marginBottom: 20,
  },
  platformsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  platformsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  platformChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});