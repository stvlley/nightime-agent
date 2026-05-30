export type LandingSignupRole = 'provider' | 'client';
export type LandingAuthMode = 'login' | 'signup';

export type ConsentPreference = 'accepted' | 'rejected';

export type LandingSignupForm = {
  email: string;
  password: string;
  displayName: string;
};

export type LandingSignupErrors = Partial<Record<keyof LandingSignupForm | 'submit', string>>;

export type SignupRoleCopy = {
  title: string;
  intro: string;
  nameLabel: string;
  namePlaceholder: string;
  action: string;
};
