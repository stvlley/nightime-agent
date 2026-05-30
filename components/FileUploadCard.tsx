import React, { useState } from 'react';
import { Alert } from 'react-native';
import { CircleAlert, CircleCheck, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { parseConversationFile } from '@/utils/chatParsers';
import { processConversationForAI } from '@/utils/aiTraining';
import { Button, Surface, Text, XStack, YStack, colors } from '@/components/ui';

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
  const IconComponent = platform.icon;

  const handleFileUpload = async () => {
    try {
      setUploading(true);
      setUploadStatus('processing');

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploadStatus('idle');
        return;
      }

      const file = result.assets[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!platform.acceptedFormats.includes(fileExtension || '')) {
        Alert.alert('Unsupported file', `${platform.name} accepts ${platform.acceptedFormats.join(', ')} files.`);
        setUploadStatus('error');
        return;
      }

      const response = await fetch(file.uri);
      const content = await response.text();
      if (!content.trim()) throw new Error('File appears to be empty');

      const parsedConversation = parseConversationFile(file.name, content);
      if (parsedConversation.messages.length === 0) throw new Error('No messages found in the file');

      const trainingData = await processConversationForAI(parsedConversation, userId);
      onUploadComplete({
        id: trainingData.conversationId,
        name: file.name,
        platform: platform.name,
        size: `${Math.round((file.size || 0) / 1024)} KB`,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
        messageCount: parsedConversation.totalMessages,
        clientName: parsedConversation.clientName,
        dateRange: parsedConversation.dateRange,
        insights: trainingData.insights,
      });

      setUploadStatus('success');
      Alert.alert('Upload complete', `Processed ${parsedConversation.totalMessages} messages.`);
    } catch (error) {
      setUploadStatus('error');
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not process this file.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  return (
    <Surface tone={uploadStatus === 'error' ? 'danger' : uploadStatus === 'success' ? 'success' : 'neutral'}>
      <XStack alignItems="center" gap={12}>
        <XStack
          width={38}
          height={38}
          borderRadius={8}
          alignItems="center"
          justifyContent="center"
          backgroundColor={colors.surfaceMuted}
        >
          <IconComponent size={18} color={colors.textSecondary} />
        </XStack>
        <YStack flex={1} gap={3}>
          <Text fontSize={15} fontWeight="700">{platform.name}</Text>
          <Text fontSize={13} color={colors.textSecondary}>{platform.description}</Text>
          <Text fontSize={12} color={colors.textMuted}>Accepts {platform.acceptedFormats.join(', ')}</Text>
        </YStack>
        {uploadStatus === 'success' ? <CircleCheck size={18} color={colors.success} /> : null}
        {uploadStatus === 'error' ? <CircleAlert size={18} color={colors.danger} /> : null}
        <Button icon={Upload} variant="secondary" loading={uploading} onPress={handleFileUpload}>Upload</Button>
      </XStack>
    </Surface>
  );
}
