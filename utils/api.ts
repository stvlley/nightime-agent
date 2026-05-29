const configuredApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE = configuredApiBase || '';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Authentication API
export const authAPI = {
  login: async (email: string, password: string): Promise<APIResponse<any>> => {
    if (!API_BASE) {
      return { success: false, error: 'EXPO_PUBLIC_API_BASE_URL is not configured' };
    }

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    return response.ok
      ? { success: true, data: await response.json() }
      : { success: false, error: `Login API returned ${response.status}` };
  },

  register: async (userData: any): Promise<APIResponse<any>> => {
    if (!API_BASE) {
      return { success: false, error: 'EXPO_PUBLIC_API_BASE_URL is not configured' };
    }

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    return response.ok
      ? { success: true, data: await response.json() }
      : { success: false, error: `Register API returned ${response.status}` };
  },
};

// Message processing API
export const messageAPI = {
  sendToWebhook: async (payload: any): Promise<APIResponse<any>> => {
    const webhookUrl = process.env.EXPO_PUBLIC_WEBHOOK_URL;
    if (!webhookUrl) {
      return { success: false, error: 'EXPO_PUBLIC_WEBHOOK_URL is not configured' };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok
      ? { success: true }
      : { success: false, error: `Webhook returned ${response.status}` };
  },

  trainAI: async (conversationData: any): Promise<APIResponse<any>> => {
    if (!API_BASE) {
      return { success: false, error: 'EXPO_PUBLIC_API_BASE_URL is not configured' };
    }

    const response = await fetch(`${API_BASE}/ai/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conversationData),
    });

    return response.ok
      ? { success: true }
      : { success: false, error: `Training API returned ${response.status}` };
  },
};

// Calendar API
export const calendarAPI = {
  getAvailability: async (date: string): Promise<APIResponse<any[]>> => {
    // Mock calendar availability
    return {
      success: true,
      data: [
        { time: '9:00 AM', available: true },
        { time: '10:00 AM', available: false },
        { time: '2:00 PM', available: true },
      ]
    };
  },

  createBooking: async (booking: any): Promise<APIResponse<any>> => {
    return { success: true, data: { id: Date.now().toString(), ...booking } };
  },
};

// File upload API
export const uploadAPI = {
  uploadConversationHistory: async (file: any, platform: string): Promise<APIResponse<any>> => {
    return {
      success: true,
      data: {
        id: Date.now().toString(),
        messageCount: Math.floor(Math.random() * 1000) + 500,
        status: 'processing'
      }
    };
  },
};
