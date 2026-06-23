import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type SupportFeedbackType = 'help' | 'bug' | 'feedback';

export type SupportFeedbackInput = {
  type: SupportFeedbackType;
  email?: string;
  name?: string;
  subject: string;
  message: string;
  route?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
};

type StrideSupportSubmitRequest = {
  projectId: string;
  publicKey: string;
  origin?: string;
  type: SupportFeedbackType;
  email?: string;
  name?: string;
  subject: string;
  message: string;
  context: {
    route?: string;
    url?: string;
    app: {
      name: string;
      version: string;
    };
    user?: {
      id?: string;
      email?: string;
      name?: string;
    };
    platform: typeof Platform.OS;
  };
};

type SupportFeedbackResult =
  | {
      mode: 'remote';
      ticketId?: number;
      ticketNumber?: number;
    }
  | {
      mode: 'local';
      id: string;
    };

const LOCAL_FEEDBACK_KEY = '@nitime_feedback_queue';

const supportEndpoint = process.env.EXPO_PUBLIC_SUPPORT_ENDPOINT?.replace(/\/$/, '');
const supportProjectId = process.env.EXPO_PUBLIC_SUPPORT_PROJECT_ID;
const supportPublicKey = process.env.EXPO_PUBLIC_SUPPORT_PUBLIC_KEY;
const supportOrigin = process.env.EXPO_PUBLIC_SUPPORT_ORIGIN;

export function isRemoteSupportFeedbackConfigured(): boolean {
  return Boolean(supportEndpoint && supportProjectId && supportPublicKey);
}

function getCurrentUrl(): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location?.href;
  }
  return undefined;
}

function getOrigin(): string | undefined {
  if (supportOrigin) return supportOrigin;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location?.origin;
  }

  return undefined;
}

function buildStrideSupportPayload(input: SupportFeedbackInput): StrideSupportSubmitRequest {
  if (!supportProjectId || !supportPublicKey) {
    throw new Error('Stride support credentials are not configured.');
  }

  const userEmail = input.user?.email;
  const userName = input.user?.name;

  return {
    projectId: supportProjectId,
    publicKey: supportPublicKey,
    origin: getOrigin(),
    type: input.type,
    email: input.email || userEmail || '',
    name: input.name || userName || undefined,
    subject: input.subject.trim(),
    message: input.message.trim(),
    context: {
      route: input.route,
      url: getCurrentUrl(),
      app: {
        name: 'Nitime',
        version: '1.0.0',
      },
      user: input.user,
      platform: Platform.OS,
    },
  };
}

async function submitRemoteFeedback(input: SupportFeedbackInput): Promise<SupportFeedbackResult> {
  if (!supportEndpoint) {
    throw new Error('Stride support endpoint is not configured.');
  }

  const response = await fetch(`${supportEndpoint}/api/public/support/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildStrideSupportPayload(input)),
  });

  if (!response.ok) {
    throw new Error('Could not submit feedback.');
  }

  const data = (await response.json()) as {
    ticket?: {
      id?: number;
      ticketNumber?: number;
    };
  };

  return {
    mode: 'remote',
    ticketId: data.ticket?.id,
    ticketNumber: data.ticket?.ticketNumber,
  };
}

async function saveLocalFeedback(input: SupportFeedbackInput): Promise<SupportFeedbackResult> {
  const id = `local-feedback-${Date.now()}`;
  const existing = await AsyncStorage.getItem(LOCAL_FEEDBACK_KEY);
  const queue = existing ? (JSON.parse(existing) as unknown[]) : [];

  queue.push({
    id,
    createdAt: new Date().toISOString(),
    ...input,
  });

  await AsyncStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(queue));
  return { mode: 'local', id };
}

export async function submitSupportFeedback(input: SupportFeedbackInput): Promise<SupportFeedbackResult> {
  if (!input.subject.trim()) {
    throw new Error('Add a short subject.');
  }

  if (!input.message.trim()) {
    throw new Error('Add a few details before submitting.');
  }

  if (isRemoteSupportFeedbackConfigured()) {
    return submitRemoteFeedback(input);
  }

  return saveLocalFeedback(input);
}
