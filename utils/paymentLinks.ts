import AsyncStorage from '@react-native-async-storage/async-storage';

// Linktree-style payment aggregator: the provider stores their own external
// payment handles (PayPal, Venmo, Cash App, Zelle) and the app renders a
// scannable card per method. Money moves directly between client and provider on
// those services — nothing is processed by us, so this stays on the "tool" side
// of the marketplace line (no money for a service through Nitime).

export type PaymentMethodId = 'paypal' | 'venmo' | 'cashapp' | 'zelle';

export interface PaymentMethodDef {
  id: PaymentMethodId;
  label: string;
  /** Brand color for the method's badge/accent. */
  color: string;
  /** Placeholder shown in the handle input. */
  placeholder: string;
  /** Short hint on the expected handle format. */
  hint: string;
  /** Visual prefix shown before the handle (e.g. "@", "$"). */
  prefix?: string;
  /**
   * Builds the value encoded into the QR / opened on tap. PayPal/Venmo/Cash App
   * have public web links; Zelle has no link standard, so its QR encodes the raw
   * handle (email or phone) for the client to use in their own bank app.
   */
  buildPayload: (handle: string) => string;
  /** Whether the payload is an openable URL (false for Zelle's raw handle). */
  openable: boolean;
}

function clean(handle: string, strip = '@$'): string {
  let h = handle.trim();
  while (h.length && strip.includes(h[0])) h = h.slice(1);
  return h;
}

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  {
    id: 'paypal',
    label: 'PayPal',
    color: '#0070BA',
    placeholder: 'your-paypal-me-name',
    hint: 'Your PayPal.Me name',
    buildPayload: (h) => `https://www.paypal.me/${clean(h)}`,
    openable: true,
  },
  {
    id: 'venmo',
    label: 'Venmo',
    color: '#3D95CE',
    placeholder: 'your-username',
    hint: 'Your Venmo username',
    prefix: '@',
    buildPayload: (h) => `https://venmo.com/u/${clean(h)}`,
    openable: true,
  },
  {
    id: 'cashapp',
    label: 'Cash App',
    color: '#00D632',
    placeholder: 'yourcashtag',
    hint: 'Your $Cashtag',
    prefix: '$',
    buildPayload: (h) => `https://cash.app/$${clean(h)}`,
    openable: true,
  },
  {
    id: 'zelle',
    label: 'Zelle',
    color: '#6D1ED4',
    placeholder: 'email or phone',
    hint: 'Email or phone registered with Zelle',
    buildPayload: (h) => clean(h, ''),
    openable: false,
  },
];

export type PaymentHandles = Partial<Record<PaymentMethodId, string>>;

const STORAGE_KEY = '@payment_links';

export async function loadPaymentHandles(): Promise<PaymentHandles> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function savePaymentHandles(handles: PaymentHandles): Promise<void> {
  // Drop empties so "configured" checks are simple.
  const pruned: PaymentHandles = {};
  for (const m of PAYMENT_METHODS) {
    const v = handles[m.id]?.trim();
    if (v) pruned[m.id] = v;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}
