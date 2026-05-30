import { describe, expect, it } from 'vitest';
import {
  getVisibleSetupServices,
  isSetupTimeValue,
  validateSetupFlowStep,
  type SetupFlowValidationPayload,
} from '../utils/setupFlowValidation';

function validPayload(overrides: Partial<SetupFlowValidationPayload> = {}): SetupFlowValidationPayload {
  return {
    businessName: 'Nightime Wellness',
    services: [{ name: 'Consultation', durationMinutes: 60 }],
    availability: { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
    ...overrides,
  };
}

describe('setup flow validation', () => {
  it('accepts a complete profile, service, and availability payload', () => {
    expect(validateSetupFlowStep('profile', validPayload())).toEqual({ valid: true });
    expect(validateSetupFlowStep('services', validPayload())).toEqual({ valid: true });
    expect(validateSetupFlowStep('availability', validPayload())).toEqual({ valid: true });
  });

  it('requires a business name on the profile step', () => {
    expect(validateSetupFlowStep('profile', validPayload({ businessName: '   ' }))).toMatchObject({
      valid: false,
      title: 'Business name required',
    });
  });

  it('requires at least one named service on the services step', () => {
    expect(
      validateSetupFlowStep(
        'services',
        validPayload({
          services: [
            { name: '', durationMinutes: 60 },
            { name: '   ', durationMinutes: 45 },
          ],
        })
      )
    ).toMatchObject({
      valid: false,
      title: 'Add one service',
    });
  });

  it('ignores blank service rows when finding visible services', () => {
    expect(
      getVisibleSetupServices(
        validPayload({
          services: [
            { name: '', durationMinutes: 60 },
            { name: 'Deep tissue', durationMinutes: 90 },
          ],
        })
      )
    ).toEqual([{ name: 'Deep tissue', durationMinutes: 90 }]);
  });

  it('requires named services to have a positive duration', () => {
    expect(
      validateSetupFlowStep(
        'services',
        validPayload({
          services: [{ name: 'Consultation', durationMinutes: 0 }],
        })
      )
    ).toMatchObject({
      valid: false,
      title: 'Check service duration',
    });
  });

  it('requires at least one availability day', () => {
    expect(
      validateSetupFlowStep(
        'availability',
        validPayload({
          availability: { days: [], startTime: '09:00', endTime: '17:00' },
        })
      )
    ).toMatchObject({
      valid: false,
      title: 'Choose days',
    });
  });

  it('validates 24-hour HH:MM time strings', () => {
    expect(isSetupTimeValue('00:00')).toBe(true);
    expect(isSetupTimeValue('09:30')).toBe(true);
    expect(isSetupTimeValue('23:59')).toBe(true);
    expect(isSetupTimeValue('9:30')).toBe(false);
    expect(isSetupTimeValue('24:00')).toBe(false);
    expect(isSetupTimeValue('12:60')).toBe(false);
    expect(isSetupTimeValue('noon')).toBe(false);
  });

  it('rejects invalid availability time formats', () => {
    expect(
      validateSetupFlowStep(
        'availability',
        validPayload({
          availability: { days: [1], startTime: '9am', endTime: '17:00' },
        })
      )
    ).toMatchObject({
      valid: false,
      title: 'Use 24-hour time',
    });
  });

  it('requires the availability end time to be later than the start time', () => {
    expect(
      validateSetupFlowStep(
        'availability',
        validPayload({
          availability: { days: [1], startTime: '17:00', endTime: '09:00' },
        })
      )
    ).toMatchObject({
      valid: false,
      title: 'Check hours',
    });
  });
});
