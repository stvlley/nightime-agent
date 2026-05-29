import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Upload, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { parseConversationFile } from '@/utils/chatParsers';
import { processConversationForAI } from '@/utils/aiTraining';

interface FileUploadCardProps {
  platform: {
    name: string;
    icon: any;
    description: string;
    acceptedFormats: string[];
  };
  onUploadComplete: (result: any) => void;
  userId: string;
}

export default function FileUploadCard({ platform, onUploadComplete, userId }: FileUploadCardProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleFileUpload = async () => {
    try {
      setUploading(true);
      setUploadStatus('processing');

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploading(false);
        setUploadStatus('idle');
        return;
      }

      const file = result.assets[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // Validate file format
      if (!platform.acceptedFormats.includes(fileExtension || '')) {
        Alert.alert(
          'Invalid File Format',
          `Please select a ${platform.acceptedFormats.join(', ')} file for ${platform.name}.`
        );
        setUploading(false);
        setUploadStatus('error');
        return;
      }

      // Read file content
      const response = await fetch(file.uri);
      const content = await response.text();

      if (!content || content.trim().length === 0) {
        throw new Error('File appears to be empty');
      }

      // Parse conversation
      const parsedConversation = parseConversationFile(file.name, content);
      
      if (parsedConversation.messages.length === 0) {
        throw new Error('No messages found in the file');
      }

      // Process for AI training
      const trainingData = await processConversationForAI(parsedConversation, userId);

      // Create upload result
      const uploadResult = {
        id: trainingData.conversationId,
        name: file.name,
        platform: platform.name,
        size: formatFileSize(file.size || 0),
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
        messageCount: parsedConversation.totalMessages,
        clientName: parsedConversation.clientName,
        dateRange: parsedConversation.dateRange,
        insights: trainingData.insights,
      };

      setUploadStatus('success');
      onUploadComplete(uploadResult);

      // Show success message
      Alert.alert(
        'Upload Successful',
        `Processed ${parsedConversation.totalMessages} messages from ${parsedConversation.clientName}. AI training data has been sent for processing.`
      );

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to process the file. Please check the format and try again.'
      );
    } finally {
      setUploading(false);
      // Reset status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'processing':
        return <ActivityIndicator size="small" color="#4f46e5" />;
      case 'success':
        return <CheckCircle size={20} color="#10b981" />;
      case 'error':
        return <AlertCircle size={20} color="#ef4444" />;
      default:
        return <Upload size={20} color="#4f46e5" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'processing':
        return '#fef3c7';
      case 'success':
        return '#dcfce7';
      case 'error':
        return '#fecaca';
      default:
        return '#f0f9ff';
    }
  };

  const IconComponent = platform.icon;

  return (
    <TouchableOpacity
      style={[
        styles.uploadCard,
        { backgroundColor: getStatusColor() },
        uploading && styles.uploadingCard
      ]}
      onPress={handleFileUpload}
      disabled={uploading}
    >
      <View style={styles.uploadCardContent}>
        <View style={styles.uploadCardLeft}>
          <View style={styles.uploadIcon}>
            <IconComponent size={24} color="#4f46e5" />
          </View>
          <View style={styles.uploadInfo}>
            <Text style={styles.platformName}>{platform.name}</Text>
            <Text style={styles.platformDescription}>{platform.description}</Text>
            <Text style={styles.acceptedFormats}>
              Accepts: {platform.acceptedFormats.join(', ')}
            </Text>
          </View>
        </View>
        <View style={styles.uploadAction}>
          {getStatusIcon()}
        </View>
      </View>
      
      {uploadStatus === 'processing' && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Processing conversation data...
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  uploadCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadingCard: {
    borderStyle: 'solid',
    borderColor: '#4f46e5',
  },
  uploadCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f0f9ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  platformDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  acceptedFormats: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    fontStyle: 'italic',
  },
  uploadAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
