import {
  Bot,
  CalendarCheck,
  MessageSquareText,
} from 'lucide-react-native';
import { LandingSignupRole, SignupRoleCopy } from './types';

export const howItWorks = [
  {
    title: 'Connect channels',
    body: 'Bring Telegram, WhatsApp, email, or SMS conversations into one provider inbox.',
    icon: MessageSquareText,
  },
  {
    title: 'Agent replies',
    body: 'Nightime Agent qualifies requests, answers basics, and offers real availability.',
    icon: Bot,
  },
  {
    title: 'Bookings land',
    body: 'Confirmed appointments appear in calendar with the client context attached.',
    icon: CalendarCheck,
  },
];

export const providerWorkflow = [
  'Unified inbox for inbound requests',
  'Availability and booking controls',
  'Saved replies and FAQ training',
  'Moderation with approve-before-send mode',
];

export const clientExperience = [
  'Discreet public profile',
  'Clear services and availability',
  'Simple booking request flow',
  'Confirmation after the provider accepts',
];

export const faqs = [
  {
    q: 'Is this replacing the provider?',
    a: 'No. The provider controls availability, policies, tone, and can take over any thread.',
  },
  {
    q: 'Can clients use it without an account?',
    a: 'The portal plan supports anonymous booking requests. This landing page only captures client intent for now.',
  },
  {
    q: 'What safety expectations are built in?',
    a: 'Age-gate support, AI disclosure, consent-based follow-ups, and moderation are treated as launch requirements.',
  },
];

export function getSignupRoleCopy(role: LandingSignupRole): SignupRoleCopy {
  if (role === 'provider') {
    return {
      title: 'Create your provider account',
      intro: 'Start with the inbox workspace, then run a short setup checkup so the assistant can draft useful replies.',
      nameLabel: 'Business or display name',
      namePlaceholder: 'Nightime Studio',
      action: 'Create account',
    };
  }

  return {
    title: 'Join client updates',
    intro: 'Tell us where to send client portal updates. Provider signup is available now; client accounts open after launch.',
    nameLabel: 'Name or handle',
    namePlaceholder: 'Alex',
    action: 'Join updates',
  };
}
