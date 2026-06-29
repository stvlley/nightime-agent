import { describe, expect, it } from 'vitest';
import {
  captureDetails,
  matchService,
  nextQualificationStep,
  parseName,
  parseNameWhenAsked,
  type Lead,
  type ServiceLite,
} from '../supabase/functions/_shared/qualification';

const SERVICES: ServiceLite[] = [
  { id: 'a', name: 'Deep Tissue Massage', durationMinutes: 90 },
  { id: 'b', name: 'Swedish Massage', durationMinutes: 60 },
];

describe('parseName', () => {
  it.each([
    ['my name is Sara', 'Sara'],
    ["I'm Jane Doe", 'Jane Doe'],
    ['this is alex', 'Alex'],
    ["it's Maria", 'Maria'],
  ])('extracts a name from %s', (text, expected) => {
    expect(parseName(text)).toBe(expected);
  });

  it('returns null when there is no introduction', () => {
    expect(parseName('can I book something tomorrow')).toBeNull();
  });

  it('does not capture filler as a name', () => {
    expect(parseName("I'm interested in booking")).toBeNull();
  });
});

describe('parseNameWhenAsked', () => {
  it('accepts a bare name reply', () => {
    expect(parseNameWhenAsked('Sara')).toBe('Sara');
    expect(parseNameWhenAsked('sara lee')).toBe('Sara Lee');
  });
  it('still honors an explicit introduction', () => {
    expect(parseNameWhenAsked('my name is Priya')).toBe('Priya');
  });
  it('rejects sentences, digits, and filler', () => {
    expect(parseNameWhenAsked('the first one works for me')).toBeNull();
    expect(parseNameWhenAsked('+15551234567')).toBeNull();
    expect(parseNameWhenAsked('yes please')).toBeNull();
  });
});

describe('matchService', () => {
  it('matches by full name', () => {
    expect(matchService('I want the Swedish Massage', SERVICES)?.id).toBe('b');
  });
  it('matches by partial token overlap', () => {
    expect(matchService('deep tissue please', SERVICES)?.id).toBe('a');
  });
  it('returns null when nothing matches', () => {
    expect(matchService('do you do facials', SERVICES)).toBeNull();
  });
});

describe('nextQualificationStep', () => {
  it('asks for a service first when there is a choice', () => {
    const step = nextQualificationStep({}, SERVICES);
    expect(step.kind).toBe('ask_service');
    expect(step.kind === 'ask_service' && step.prompt).toContain('Swedish Massage');
  });

  it('skips the service question when there is only one service', () => {
    const step = nextQualificationStep({}, [SERVICES[0]]);
    expect(step.kind).toBe('ask_name');
  });

  it('asks for a name once a service is chosen', () => {
    const step = nextQualificationStep({ serviceId: 'b', serviceName: 'Swedish Massage' }, SERVICES);
    expect(step.kind).toBe('ask_name');
  });

  it('is ready once name and service are known', () => {
    const lead: Lead = { name: 'Sara', serviceId: 'b', serviceName: 'Swedish Massage' };
    expect(nextQualificationStep(lead, SERVICES).kind).toBe('ready');
  });

  it('is ready with just a name when there is a single service', () => {
    expect(nextQualificationStep({ name: 'Sara' }, [SERVICES[0]]).kind).toBe('ready');
  });
});

describe('captureDetails', () => {
  it('captures a service mentioned up front', () => {
    const lead = captureDetails({}, 'can I book the deep tissue massage?', SERVICES, false);
    expect(lead.serviceId).toBe('a');
    expect(lead.serviceName).toBe('Deep Tissue Massage');
  });

  it('captures a bare name only when expecting one', () => {
    expect(captureDetails({}, 'Sara', SERVICES, false).name).toBeUndefined();
    expect(captureDetails({}, 'Sara', SERVICES, true).name).toBe('Sara');
  });

  it('does not overwrite details already captured', () => {
    const lead: Lead = { name: 'Sara', serviceId: 'b', serviceName: 'Swedish Massage' };
    const next = captureDetails(lead, 'actually the deep tissue', SERVICES, false);
    expect(next.serviceId).toBe('b'); // unchanged
    expect(next.name).toBe('Sara');
  });

  it('walks a full intake to ready across turns', () => {
    let lead: Lead = {};
    // Turn 1: booking intent, no details.
    expect(nextQualificationStep(lead, SERVICES).kind).toBe('ask_service');
    // Turn 2: client names a service.
    lead = captureDetails(lead, 'the swedish one', SERVICES, false);
    expect(nextQualificationStep(lead, SERVICES).kind).toBe('ask_name');
    // Turn 3: client gives their name.
    lead = captureDetails(lead, 'Jordan', SERVICES, true);
    expect(nextQualificationStep(lead, SERVICES).kind).toBe('ready');
    expect(lead).toMatchObject({ name: 'Jordan', serviceId: 'b' });
  });
});
