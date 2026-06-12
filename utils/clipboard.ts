import { Platform, Share } from 'react-native';

/**
 * Put text in the user's hands without adding a clipboard dependency:
 * web copies to the clipboard, native opens the share sheet.
 * Returns the verb that happened so callers can phrase the confirmation.
 */
export async function copyOrShare(text: string): Promise<'copied' | 'shared' | 'failed'> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  try {
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}
