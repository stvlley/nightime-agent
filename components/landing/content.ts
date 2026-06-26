import { LandingSignupRole, SignupRoleCopy } from './types';

export function getSignupRoleCopy(role: LandingSignupRole): SignupRoleCopy {
  if (role === 'provider') {
    return {
      title: 'Create your provider account',
      intro:
        'Start with a private booking workspace, then complete a short setup so nitime can draft replies with your rules, tone, and availability.',
      nameLabel: 'Business or display name',
      namePlaceholder: 'nitime Studio',
      action: 'Create account',
    };
  }

  return {
    title: 'Join client updates',
    intro:
      'Tell us where to send client portal updates. Provider signup is available now; client access opens after launch.',
    nameLabel: 'Name or handle',
    namePlaceholder: 'Alex',
    action: 'Join updates',
  };
}
