import { AILearningProgress, TrainingData } from '@/utils/aiTraining';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local storage utilities for offline functionality

export const StorageKeys = {
  USER_DATA: '@therapybot_user',
  AI_SETTINGS: '@therapybot_ai_settings',
  CONVERSATIONS: '@therapybot_conversations',
  FAQS: '@therapybot_faqs',
  UPLOAD_QUEUE: '@therapybot_upload_queue',
  TRAINING_DATA: '@therapybot_training_data',
  AI_PROGRESS: '@therapybot_ai_progress',
} as const;

export const storage = {
  // Store data
  setItem: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },

  // Get data
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  // Remove data
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },

  // Clear all data
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

// Specialized storage functions
export const userStorage = {
  saveUser: (userData: any) => storage.setItem(StorageKeys.USER_DATA, userData),
  getUser: () => storage.getItem(StorageKeys.USER_DATA),
  clearUser: () => storage.removeItem(StorageKeys.USER_DATA),
};

export const conversationStorage = {
  saveConversations: (conversations: any[]) => 
    storage.setItem(StorageKeys.CONVERSATIONS, conversations),
  getConversations: () => storage.getItem<any[]>(StorageKeys.CONVERSATIONS),
  addConversation: async (conversation: any) => {
    const existing = await storage.getItem<any[]>(StorageKeys.CONVERSATIONS) || [];
    await storage.setItem(StorageKeys.CONVERSATIONS, [conversation, ...existing]);
  },
};

export const trainingStorage = {
  saveTrainingData: (data: TrainingData[]) =>
    storage.setItem(StorageKeys.TRAINING_DATA, data),
  getTrainingData: () => storage.getItem<TrainingData[]>(StorageKeys.TRAINING_DATA),
  addTrainingData: async (data: TrainingData) => {
    const existing = await storage.getItem<TrainingData[]>(StorageKeys.TRAINING_DATA) || [];
    await storage.setItem(StorageKeys.TRAINING_DATA, [data, ...existing]);
  },
  saveAIProgress: (progress: AILearningProgress) =>
    storage.setItem(StorageKeys.AI_PROGRESS, progress),
  getAIProgress: () => storage.getItem<AILearningProgress>(StorageKeys.AI_PROGRESS),
};
