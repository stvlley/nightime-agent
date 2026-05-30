import type {
  ApprovalMode,
  ModerationLevel,
  NotificationPermissionState,
  SetupAvailabilityDraft,
  SetupPayload,
  SetupServiceDraft,
} from './setup';
import { isSetupTimeValue } from './setupFlowValidation';

export type SetupChatNodeId =
  | 'business'
  | 'category'
  | 'questions'
  | 'suggestions'
  | 'channels'
  | 'offers'
  | 'booking'
  | 'availability'
  | 'tone'
  | 'boundaries'
  | 'approval'
  | 'followup'
  | 'moderation'
  | 'notifications'
  | 'review';

export type SetupChatAnswer =
  | string
  | string[]
  | boolean
  | NotificationPermissionState
  | SetupServiceDraft[]
  | SetupAvailabilityDraft;

export type SetupChatNode = {
  id: SetupChatNodeId;
  label: string;
  prompt: string;
  answerKind:
    | 'text'
    | 'textarea'
    | 'single'
    | 'suggestions'
    | 'multi'
    | 'services'
    | 'availability'
    | 'boolean'
    | 'notification'
    | 'review';
  quickReplies?: string[];
  optional?: boolean;
};

export type SetupChatValidationResult =
  | { valid: true }
  | { valid: false; title: string; message: string };

export const setupChatOrder: SetupChatNodeId[] = [
  'business',
  'category',
  'questions',
  'suggestions',
  'channels',
  'offers',
  'booking',
  'availability',
  'tone',
  'boundaries',
  'approval',
  'followup',
  'moderation',
  'notifications',
  'review',
];

const categories = ['Wellness', 'Beauty', 'Fitness', 'Consulting', 'Home services', 'Other'];
const channels = ['Instagram DM', 'SMS', 'WhatsApp', 'Telegram', 'Email', 'Phone calls'];
const tones = ['Warm and concise', 'Professional', 'Friendly', 'Direct', 'Luxury'];

export function getSetupChatNode(nodeId: SetupChatNodeId): SetupChatNode {
  switch (nodeId) {
    case 'business':
      return {
        id: nodeId,
        label: 'Business',
        prompt: "Let's set up your message assistant. What business or display name should it use?",
        answerKind: 'text',
      };
    case 'category':
      return {
        id: nodeId,
        label: 'Category',
        prompt: 'What kind of provider are you? This helps the assistant understand client intent.',
        answerKind: 'single',
        quickReplies: categories,
      };
    case 'channels':
      return {
        id: nodeId,
        label: 'Channels',
        prompt: 'Where do clients message you today?',
        answerKind: 'multi',
        quickReplies: channels,
      };
    case 'suggestions':
      return {
        id: nodeId,
        label: 'Suggestions',
        prompt: 'I can suggest a starter setup from what you shared. You can keep it, edit it, or skip it.',
        answerKind: 'suggestions',
        quickReplies: ['Use these suggestions', 'Skip suggestions'],
      };
    case 'questions':
      return {
        id: nodeId,
        label: 'Questions',
        prompt: 'What are the most common questions clients send before you reply?',
        answerKind: 'textarea',
      };
    case 'offers':
      return {
        id: nodeId,
        label: 'Offers',
        prompt: 'Add the services or offers clients commonly ask about in messages.',
        answerKind: 'services',
        optional: true,
      };
    case 'booking':
      return {
        id: nodeId,
        label: 'Booking',
        prompt: 'Do clients usually try to book a time inside these messages?',
        answerKind: 'boolean',
        quickReplies: ['Yes, booking happens in messages', 'Not yet, just answer questions'],
      };
    case 'availability':
      return {
        id: nodeId,
        label: 'Availability',
        prompt: 'Give me the basic weekly window the assistant can reference when booking comes up.',
        answerKind: 'availability',
      };
    case 'tone':
      return {
        id: nodeId,
        label: 'Tone',
        prompt: 'What tone should replies use by default?',
        answerKind: 'single',
        quickReplies: tones,
      };
    case 'boundaries':
      return {
        id: nodeId,
        label: 'Boundaries',
        prompt: 'What should the assistant avoid saying, promising, or handling without you?',
        answerKind: 'textarea',
      };
    case 'approval':
      return {
        id: nodeId,
        label: 'Approval',
        prompt: 'How much can the assistant do before you review a message?',
        answerKind: 'single',
        quickReplies: ['Manual approval', 'Auto-response for eligible messages'],
      };
    case 'followup':
      return {
        id: nodeId,
        label: 'Follow-up',
        prompt: 'Should it send polite follow-ups when a client goes quiet?',
        answerKind: 'boolean',
        quickReplies: ['Follow-ups on', 'Follow-ups off'],
      };
    case 'moderation':
      return {
        id: nodeId,
        label: 'Safety',
        prompt: 'How strict should message moderation be?',
        answerKind: 'single',
        quickReplies: ['Low', 'Medium', 'Strict'],
      };
    case 'notifications':
      return {
        id: nodeId,
        label: 'Alerts',
        prompt: 'Last permission step: notifications can alert you when a message needs attention.',
        answerKind: 'notification',
      };
    case 'review':
      return {
        id: nodeId,
        label: 'Review',
        prompt: "Here's what I'll save for your message assistant. Review it, then save when it looks right.",
        answerKind: 'review',
      };
  }
}

export function getNextSetupChatNodeId(current: SetupChatNodeId, payload: SetupPayload): SetupChatNodeId {
  if (current === 'booking') {
    return payload.bookingContextEnabled ? 'availability' : 'tone';
  }

  const currentIndex = setupChatOrder.indexOf(current);
  const next = setupChatOrder[currentIndex + 1] ?? 'review';

  if (next === 'availability' && !payload.bookingContextEnabled) {
    return 'tone';
  }

  return next;
}

export function validateSetupChatAnswer(
  nodeId: SetupChatNodeId,
  answer: SetupChatAnswer,
  payload: SetupPayload
): SetupChatValidationResult {
  if (nodeId === 'business' && typeof answer === 'string' && !answer.trim()) {
    return { valid: false, title: 'Business name required', message: 'Add a name before we keep going.' };
  }

  if (nodeId === 'channels' && Array.isArray(answer) && answer.length === 0) {
    return { valid: false, title: 'Choose a channel', message: 'Pick at least one place clients message you.' };
  }

  if (nodeId === 'questions' && typeof answer === 'string' && !answer.trim()) {
    return { valid: false, title: 'Add one question', message: 'Add at least one common client question.' };
  }

  if (nodeId === 'suggestions' && typeof answer !== 'boolean') {
    return { valid: false, title: 'Choose an option', message: 'Use or skip the suggested defaults.' };
  }

  if (nodeId === 'offers' && Array.isArray(answer)) {
    const namedOffers = answer.filter((service) => typeof service !== 'string' && service.name.trim());
    if (namedOffers.some((service) => typeof service !== 'string' && service.durationMinutes <= 0)) {
      return { valid: false, title: 'Check offer duration', message: 'Durations must be greater than zero minutes.' };
    }
  }

  if (nodeId === 'availability' && payload.bookingContextEnabled) {
    const availability = answer as SetupAvailabilityDraft;
    if (availability.days.length === 0) {
      return { valid: false, title: 'Choose days', message: 'Pick at least one booking day.' };
    }
    if (!isSetupTimeValue(availability.startTime) || !isSetupTimeValue(availability.endTime)) {
      return { valid: false, title: 'Use 24-hour time', message: 'Enter times as HH:MM, for example 09:00.' };
    }
    if (availability.endTime <= availability.startTime) {
      return { valid: false, title: 'Check hours', message: 'End time must be later than start time.' };
    }
  }

  return { valid: true };
}

export function applySetupChatAnswer(
  nodeId: SetupChatNodeId,
  payload: SetupPayload,
  answer: SetupChatAnswer
): SetupPayload {
  switch (nodeId) {
    case 'business': {
      const name = String(answer).trim();
      return { ...payload, businessName: name, displayName: payload.displayName || name };
    }
    case 'category':
      return { ...payload, businessCategory: String(answer) };
    case 'channels':
      return { ...payload, messageChannels: answer as string[] };
    case 'questions':
      return {
        ...payload,
        commonQuestions: String(answer)
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      };
    case 'suggestions':
      return payload;
    case 'offers':
      return { ...payload, services: answer as SetupServiceDraft[] };
    case 'booking':
      return { ...payload, bookingContextEnabled: Boolean(answer) };
    case 'availability':
      return { ...payload, availability: answer as SetupAvailabilityDraft };
    case 'tone':
      return { ...payload, agentTone: String(answer) };
    case 'boundaries':
      return { ...payload, responseBoundaries: String(answer).trim() };
    case 'approval':
      return {
        ...payload,
        approvalMode: String(answer).startsWith('Auto')
          ? ('auto_eligible' as ApprovalMode)
          : ('manual' as ApprovalMode),
      };
    case 'followup':
      return { ...payload, followUpEnabled: Boolean(answer) };
    case 'moderation':
      return { ...payload, moderationLevel: String(answer).toLowerCase() as ModerationLevel };
    case 'notifications':
      return {
        ...payload,
        notificationPermission: answer as NotificationPermissionState,
        notificationsEnabled: answer === 'granted',
      };
    case 'review':
      return payload;
  }
}

export function formatSetupChatAnswer(nodeId: SetupChatNodeId, answer: SetupChatAnswer): string {
  if (nodeId === 'channels' && Array.isArray(answer)) return answer.join(', ');
  if (nodeId === 'questions') return String(answer).trim();
  if (nodeId === 'offers' && Array.isArray(answer)) {
    const offers = answer.filter((item) => typeof item !== 'string' && item.name.trim()) as SetupServiceDraft[];
    return offers.length ? offers.map((offer) => offer.name.trim()).join(', ') : 'No offers yet';
  }
  if (nodeId === 'booking') return answer ? 'Yes, booking happens in messages' : 'Not yet, just answer questions';
  if (nodeId === 'suggestions') return answer ? 'Use these suggestions' : 'Skip suggestions';
  if (nodeId === 'availability') {
    const value = answer as SetupAvailabilityDraft;
    return `${value.days.length} day(s), ${value.startTime}-${value.endTime}`;
  }
  if (nodeId === 'followup') return answer ? 'Follow-ups on' : 'Follow-ups off';
  if (nodeId === 'notifications') return `Notifications ${answer}`;
  return String(answer);
}

export function buildSetupReviewItems(payload: SetupPayload) {
  return [
    { label: 'Provider', value: `${payload.displayName || payload.businessName} - ${payload.businessCategory}` },
    { label: 'Channels', value: payload.messageChannels.join(', ') || 'Not set' },
    { label: 'Common questions', value: payload.commonQuestions.join('; ') || 'Not set' },
    {
      label: 'Offers',
      value: payload.services.filter((service) => service.name.trim()).map((service) => service.name).join(', ') || 'Skipped',
    },
    {
      label: 'Booking context',
      value: payload.bookingContextEnabled ? `${payload.availability.startTime}-${payload.availability.endTime}` : 'Not used yet',
    },
    {
      label: 'Tone and boundaries',
      value: `${payload.agentTone} - ${payload.responseBoundaries || 'No extra boundaries'}`,
    },
    {
      label: 'Controls',
      value: `${payload.approvalMode} - ${payload.moderationLevel} moderation - follow-up ${payload.followUpEnabled ? 'on' : 'off'}`,
    },
    { label: 'Notifications', value: payload.notificationPermission },
  ];
}

export function getSetupChatProgress(nodeId: SetupChatNodeId, payload: SetupPayload) {
  const visibleOrder = payload.bookingContextEnabled
    ? setupChatOrder
    : setupChatOrder.filter((id) => id !== 'availability');
  const index = visibleOrder.indexOf(nodeId);
  return { current: Math.max(index, 0) + 1, total: visibleOrder.length };
}
