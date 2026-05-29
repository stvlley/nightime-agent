import { useState, useEffect } from 'react';
import { trainingStorage } from '@/utils/storage';
import { AILearningProgress, TrainingData } from '@/utils/aiTraining';

export function useAITraining() {
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [aiProgress, setAiProgress] = useState<AILearningProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      const [data, progress] = await Promise.all([
        trainingStorage.getTrainingData(),
        trainingStorage.getAIProgress(),
      ]);
      
      setTrainingData(data || []);
      setAiProgress(progress);
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrainingData = async (data: TrainingData) => {
    try {
      await trainingStorage.addTrainingData(data);
      setTrainingData(prev => [data, ...prev]);
      
      // Update AI progress
      const newProgress: AILearningProgress = {
        totalConversations: trainingData.length + 1,
        totalMessages: trainingData.reduce((sum, d) => sum + d.messageCount, 0) + data.messageCount,
        platformBreakdown: calculatePlatformBreakdown([data, ...trainingData]),
        confidenceScore: calculateConfidenceScore([data, ...trainingData]),
        lastTrainingDate: new Date().toISOString(),
      };
      
      await trainingStorage.saveAIProgress(newProgress);
      setAiProgress(newProgress);
    } catch (error) {
      console.error('Failed to save training data:', error);
      throw error;
    }
  };

  const calculatePlatformBreakdown = (data: TrainingData[]) => {
    const breakdown: Record<string, number> = {};
    data.forEach(item => {
      breakdown[item.platform] = (breakdown[item.platform] || 0) + 1;
    });
    return breakdown;
  };

  const calculateConfidenceScore = (data: TrainingData[]) => {
    if (data.length === 0) return 0;
    
    const totalMessages = data.reduce((sum, d) => sum + d.messageCount, 0);
    let score = Math.min(totalMessages / 1000, 0.7); // Base score from message count
    
    // Bonus for conversation diversity
    if (data.length > 5) score += 0.1;
    if (data.length > 10) score += 0.1;
    
    // Bonus for platform diversity
    const platforms = new Set(data.map(d => d.platform));
    if (platforms.size > 2) score += 0.1;
    
    return Math.min(score, 1.0);
  };

  const getRecommendations = () => {
    if (!aiProgress) return [];
    
    const recommendations = [];
    
    if (aiProgress.totalConversations < 5) {
      recommendations.push({
        type: 'upload',
        message: 'Upload more conversations to improve AI accuracy',
        priority: 'high',
      });
    }
    
    if (Object.keys(aiProgress.platformBreakdown).length < 2) {
      recommendations.push({
        type: 'platform',
        message: 'Add conversations from different platforms for better coverage',
        priority: 'medium',
      });
    }
    
    if (aiProgress.confidenceScore < 0.6) {
      recommendations.push({
        type: 'quality',
        message: 'Upload longer conversations with more detailed responses',
        priority: 'high',
      });
    }
    
    return recommendations;
  };

  return {
    trainingData,
    aiProgress,
    loading,
    addTrainingData,
    loadTrainingData,
    recommendations: getRecommendations(),
  };
}