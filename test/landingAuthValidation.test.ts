import { describe, expect, it } from 'vitest';
import { validateLandingAuthForm } from '../utils/landingAuthValidation';

describe('landing auth modal validation', () => {
  it('allows login with only email and password', () => {
    expect(
      validateLandingAuthForm(
        { email: 'provider@example.com', password: 'secret', displayName: '' },
        'provider',
        'login'
      )
    ).toEqual({});
  });

  it('requires email and password for login', () => {
    expect(
      validateLandingAuthForm(
        { email: '', password: '', displayName: '' },
        'provider',
        'login'
      )
    ).toMatchObject({
      email: 'Email is required.',
      password: 'Password is required.',
    });
  });

  it('requires provider signup display name and an eight character password', () => {
    expect(
      validateLandingAuthForm(
        { email: 'provider@example.com', password: 'short', displayName: '' },
        'provider',
        'signup'
      )
    ).toMatchObject({
      displayName: 'Business or display name is required.',
      password: 'Use at least 8 characters.',
    });
  });

  it('does not require a password for client early access signup', () => {
    expect(
      validateLandingAuthForm(
        { email: 'client@example.com', password: '', displayName: 'Client' },
        'client',
        'signup'
      )
    ).toEqual({});
  });
});
