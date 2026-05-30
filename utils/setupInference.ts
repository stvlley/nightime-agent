import type { SetupPayload, SetupServiceDraft } from './setup';

export type SetupInferenceSuggestion = {
  messageChannels: string[];
  services: SetupServiceDraft[];
  agentTone: string;
  responseBoundaries: string;
};

export type SetupInferenceResult = {
  source: 'deterministic';
  confidence: number;
  suggestions: SetupInferenceSuggestion;
  summary: string;
};

const categoryDefaults: Record<
  string,
  Pick<SetupInferenceSuggestion, 'messageChannels' | 'services' | 'agentTone' | 'responseBoundaries'>
> = {
  Wellness: {
    messageChannels: ['Instagram DM', 'SMS'],
    services: [{ name: 'Consultation', durationMinutes: 60, price: '100' }],
    agentTone: 'Warm and concise',
    responseBoundaries: 'Do not diagnose, guarantee outcomes, or pressure clients.',
  },
  Beauty: {
    messageChannels: ['Instagram DM', 'SMS'],
    services: [{ name: 'Appointment', durationMinutes: 60, price: '100' }],
    agentTone: 'Friendly',
    responseBoundaries: 'Do not promise availability, discounts, or results without approval.',
  },
  Fitness: {
    messageChannels: ['Instagram DM', 'SMS'],
    services: [{ name: 'Training session', durationMinutes: 60, price: '100' }],
    agentTone: 'Direct',
    responseBoundaries: 'Do not provide medical advice or guarantee fitness outcomes.',
  },
  Consulting: {
    messageChannels: ['Email', 'SMS'],
    services: [{ name: 'Intro call', durationMinutes: 30, price: '0' }],
    agentTone: 'Professional',
    responseBoundaries: 'Do not quote final scope, pricing, or timelines without approval.',
  },
  'Home services': {
    messageChannels: ['SMS', 'Phone calls', 'Email'],
    services: [{ name: 'Estimate request', durationMinutes: 30, price: '0' }],
    agentTone: 'Professional',
    responseBoundaries: 'Do not confirm jobs, arrival windows, or final pricing without approval.',
  },
  Other: {
    messageChannels: ['Instagram DM', 'SMS'],
    services: [{ name: 'Consultation', durationMinutes: 60, price: '100' }],
    agentTone: 'Warm and concise',
    responseBoundaries: 'Do not make promises, confirm availability, or handle sensitive issues without approval.',
  },
};

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function inferBookingService(payload: SetupPayload): SetupServiceDraft[] {
  const questionText = payload.commonQuestions.join(' ').toLowerCase();
  const asksAboutAvailability = /\b(book|available|availability|appointment|schedule|tonight|tomorrow)\b/.test(
    questionText
  );

  if (!asksAboutAvailability) {
    return [];
  }

  return [{ name: 'Appointment request', durationMinutes: 60, price: '100' }];
}

export async function suggestSetupDefaults(payload: SetupPayload): Promise<SetupInferenceResult> {
  const defaults = categoryDefaults[payload.businessCategory] ?? categoryDefaults.Other;
  const inferredBookingServices = inferBookingService(payload);
  const services = payload.services.some((service) => service.name.trim())
    ? payload.services
    : inferredBookingServices.length
      ? inferredBookingServices
      : defaults.services;

  return {
    source: 'deterministic',
    confidence: payload.commonQuestions.length > 0 ? 0.72 : 0.54,
    suggestions: {
      messageChannels: payload.messageChannels.length ? payload.messageChannels : uniq(defaults.messageChannels),
      services,
      agentTone: payload.agentTone || defaults.agentTone,
      responseBoundaries: payload.responseBoundaries || defaults.responseBoundaries,
    },
    summary: 'I can prefill channels, offers, tone, and boundaries from your category and common questions.',
  };
}

export function applySetupInferenceSuggestions(
  payload: SetupPayload,
  suggestion: SetupInferenceSuggestion
): SetupPayload {
  return {
    ...payload,
    messageChannels: suggestion.messageChannels,
    services: suggestion.services,
    agentTone: suggestion.agentTone,
    responseBoundaries: suggestion.responseBoundaries,
  };
}
