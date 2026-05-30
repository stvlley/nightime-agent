import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Mail, MessageSquare, Smartphone, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { parseConversationFile } from '@/utils/chatParsers';
import { processConversationForAI } from '@/utils/aiTraining';
import { XStack, YStack, Text, Badge, Button, EmptyState, ListRow, PageHeader, Screen, Section, Surface, colors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

interface UploadResult {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  clientName: string;
  status: 'completed';
}

const platforms = [
  { name: 'WhatsApp', icon: MessageSquare, description: 'Exported chat text files', acceptedFormats: ['txt'] },
  { name: 'Email', icon: Mail, description: 'Plain text or CSV conversation exports', acceptedFormats: ['txt', 'csv'] },
  { name: 'Telegram', icon: Smartphone, description: 'JSON or text export files', acceptedFormats: ['json', 'txt'] },
];

export default function UploadScreen() {
  const { user } = useAuth();
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadResult[]>([]);

  const handleUpload = async (platform: (typeof platforms)[number]) => {
    try {
      setUploadingPlatform(platform.name);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!platform.acceptedFormats.includes(fileExtension || '')) {
        Alert.alert('Unsupported file', `${platform.name} accepts ${platform.acceptedFormats.join(', ')} files.`);
        return;
      }

      const response = await fetch(file.uri);
      const content = await response.text();
      if (!content.trim()) throw new Error('File appears to be empty');

      const parsedConversation = parseConversationFile(file.name, content);
      if (parsedConversation.messages.length === 0) throw new Error('No messages found in the file');

      const trainingData = await processConversationForAI(parsedConversation, user?.id ?? 'demo-user');
      setUploads([
        {
          id: trainingData.conversationId,
          name: file.name,
          platform: platform.name,
          messageCount: parsedConversation.totalMessages,
          clientName: parsedConversation.clientName,
          status: 'completed',
        },
        ...uploads,
      ]);
      Alert.alert('Upload complete', `Processed ${parsedConversation.totalMessages} messages.`);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not process this file.');
    } finally {
      setUploadingPlatform(null);
    }
  };

  return (
    <Screen>
      <PageHeader title="Training" subtitle="Import prior conversations for agent tuning." />

      <Section title="Sources">
        <YStack gap={10}>
          {platforms.map((platform) => (
            <Surface key={platform.name}>
              <XStack alignItems="center" gap={12}>
                <XStack
                  width={38}
                  height={38}
                  borderRadius={8}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={colors.surfaceMuted}
                >
                  <platform.icon size={18} color={colors.textSecondary} />
                </XStack>
                <YStack flex={1} gap={3}>
                  <Text fontSize={15} fontWeight="700" color={colors.text}>{platform.name}</Text>
                  <Text fontSize={13} color={colors.textSecondary}>{platform.description}</Text>
                  <Text fontSize={12} color={colors.textMuted}>Accepts {platform.acceptedFormats.join(', ')}</Text>
                </YStack>
                <Button
                  icon={Upload}
                  variant="secondary"
                  loading={uploadingPlatform === platform.name}
                  onPress={() => handleUpload(platform)}
                >
                  Upload
                </Button>
              </XStack>
            </Surface>
          ))}
        </YStack>
      </Section>

      <Section title="Recent imports">
        {uploads.length === 0 ? (
          <EmptyState title="No imports yet" message="Uploaded conversation files will appear here." />
        ) : (
          <YStack gap={10}>
            {uploads.map((upload) => (
              <ListRow
                key={upload.id}
                title={upload.name}
                subtitle={`${upload.clientName}, ${upload.messageCount} messages`}
                meta={upload.platform}
                badge={<Badge tone="success">processed</Badge>}
              />
            ))}
          </YStack>
        )}
      </Section>
    </Screen>
  );
}
