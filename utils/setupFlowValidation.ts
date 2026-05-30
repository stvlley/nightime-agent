export type SetupFlowStepId = 'profile' | 'services' | 'availability' | 'category' | 'tone' | 'approval' | 'followup' | 'moderation' | 'notifications' | 'review';

export type SetupFlowValidationPayload = {
  businessName: string;
  services: {
    name: string;
    durationMinutes: number;
  }[];
  availability: {
    days: number[];
    startTime: string;
    endTime: string;
  };
};

export type SetupFlowValidationResult =
  | { valid: true }
  | {
      valid: false;
      title: string;
      message: string;
    };

export function getVisibleSetupServices(payload: SetupFlowValidationPayload) {
  return payload.services.filter((service) => service.name.trim());
}

export function isSetupTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateSetupFlowStep(
  stepId: SetupFlowStepId,
  payload: SetupFlowValidationPayload
): SetupFlowValidationResult {
  const visibleServices = getVisibleSetupServices(payload);

  if (stepId === 'profile' && !payload.businessName.trim()) {
    return {
      valid: false,
      title: 'Business name required',
      message: 'Add a business name before continuing.',
    };
  }

  if (stepId === 'services' && visibleServices.length === 0) {
    return {
      valid: false,
      title: 'Add one service',
      message: 'Add at least one service name or skip back later from settings.',
    };
  }

  if (stepId === 'services' && visibleServices.some((service) => service.durationMinutes <= 0)) {
    return {
      valid: false,
      title: 'Check service duration',
      message: 'Service duration must be greater than zero minutes.',
    };
  }

  if (stepId === 'availability' && payload.availability.days.length === 0) {
    return {
      valid: false,
      title: 'Choose days',
      message: 'Select at least one day for normal availability.',
    };
  }

  if (
    stepId === 'availability' &&
    (!isSetupTimeValue(payload.availability.startTime) || !isSetupTimeValue(payload.availability.endTime))
  ) {
    return {
      valid: false,
      title: 'Use 24-hour time',
      message: 'Enter availability times as HH:MM, for example 09:00 and 17:00.',
    };
  }

  if (stepId === 'availability' && payload.availability.endTime <= payload.availability.startTime) {
    return {
      valid: false,
      title: 'Check hours',
      message: 'Availability end time must be later than the start time.',
    };
  }

  return { valid: true };
}
