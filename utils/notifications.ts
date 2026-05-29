// FCM Push Notifications and Deep Linking
import { Thread, Message, Booking } from '@/types/booking';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: {
    url: string;
    threadId?: string;
    bookingId?: string;
    type: string;
  };
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class NotificationManager {
  private fcmToken: string | null = null;
  private vapidKey: string = 'YOUR_VAPID_KEY'; // Replace with actual VAPID key

  /**
   * Initialize FCM and request permission
   */
  async initialize(): Promise<boolean> {
    try {
      if (
        typeof window === 'undefined' ||
        typeof navigator === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        typeof Notification === 'undefined'
      ) {
        console.warn('Push messaging not supported');
        return false;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered');

      // Get FCM token
      await this.getFCMToken(registration);
      
      return true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token and register with server
   */
  private async getFCMToken(registration: ServiceWorkerRegistration): Promise<void> {
    try {
      // Mock FCM token - in real implementation, use Firebase SDK
      const token = await this.generateMockFCMToken();
      this.fcmToken = token;

      // Register token with server
      await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token })
      });

      console.log('FCM token registered');
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
  }

  /**
   * Show local notification (for immediate alerts)
   */
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      if (
        typeof navigator === 'undefined' ||
        typeof Notification === 'undefined' ||
        !('serviceWorker' in navigator) ||
        Notification.permission !== 'granted'
      ) {
        console.warn('Notifications not permitted');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const options = {
        body: payload.body,
        icon: payload.icon || '/assets/images/icon-192.png',
        badge: payload.badge || '/assets/images/badge-72.png',
        tag: payload.tag || 'default',
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
        data: payload.data || {}
      } as NotificationOptions & { actions?: NotificationAction[] };

      await registration.showNotification(payload.title, options);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Create notification for message requiring approval
   */
  createApprovalNotification(thread: Thread, message: Message): NotificationPayload {
    return {
      title: 'Message Needs Approval',
      body: `New message from ${thread.clientName || thread.clientHandle}: "${this.truncateText(message.text, 100)}"`,
      tag: `approval-${thread.id}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View & Approve', icon: '/assets/images/approve-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      data: {
        url: `/inbox?thread=${thread.id}`,
        threadId: thread.id,
        type: 'approval'
      }
    };
  }

  /**
   * Create notification for new booking
   */
  createBookingNotification(thread: Thread, booking: Booking): NotificationPayload {
    const date = new Date(booking.start);
    const timeStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return {
      title: 'New Booking Confirmed',
      body: `${booking.clientName || thread.clientHandle} booked ${booking.service} for ${timeStr}`,
      tag: `booking-${booking.id}`,
      actions: [
        { action: 'view', title: 'View Details', icon: '/assets/images/calendar-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      data: {
        url: `/calendar?booking=${booking.id}`,
        bookingId: booking.id,
        threadId: thread.id,
        type: 'booking'
      }
    };
  }

  /**
   * Create notification for missed call/voicemail
   */
  createMissedCallNotification(thread: Thread, message: Message): NotificationPayload {
    const metadata = message.metadata as Message['metadata'] & { isVoicemail?: boolean };
    const isVoicemail = metadata?.isVoicemail;
    
    return {
      title: isVoicemail ? 'New Voicemail' : 'Missed Call',
      body: isVoicemail 
        ? `Voicemail from ${thread.clientHandle}: "${this.truncateText(message.text, 100)}"` 
        : `Missed call from ${thread.clientHandle}`,
      tag: `call-${thread.id}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Message', icon: '/assets/images/phone-icon.png' },
        { action: 'callback', title: 'Call Back', icon: '/assets/images/callback-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      data: {
        url: `/inbox?thread=${thread.id}`,
        threadId: thread.id,
        type: 'missed_call'
      }
    };
  }

  /**
   * Create notification for booking cancellation
   */
  createCancellationNotification(booking: Booking): NotificationPayload {
    const date = new Date(booking.start);
    const timeStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return {
      title: 'Booking Cancelled',
      body: `${booking.clientName} cancelled their ${booking.service} appointment for ${timeStr}`,
      tag: `cancel-${booking.id}`,
      actions: [
        { action: 'view', title: 'View Details', icon: '/assets/images/calendar-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      data: {
        url: `/calendar?booking=${booking.id}`,
        bookingId: booking.id,
        type: 'cancellation'
      }
    };
  }

  /**
   * Schedule notification (for reminders, follow-ups, etc.)
   */
  async scheduleNotification(
    payload: NotificationPayload, 
    scheduledFor: Date
  ): Promise<void> {
    try {
      // Calculate delay
      const delay = scheduledFor.getTime() - Date.now();
      
      if (delay <= 0) {
        // Send immediately
        await this.showLocalNotification(payload);
        return;
      }

      // Browser timers are a demo fallback. Production reminders should be scheduled server-side.
      setTimeout(async () => {
        await this.showLocalNotification(payload);
      }, delay);

      console.log(`Notification scheduled for ${scheduledFor.toISOString()}`);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  /**
   * Handle deep link navigation
   */
  async handleDeepLink(url: string, data?: any): Promise<void> {
    try {
      // Parse URL and extract parameters
      if (typeof window === 'undefined') {
        return;
      }

      const urlObj = new URL(url, window.location.origin);
      const path = urlObj.pathname;
      const params = new URLSearchParams(urlObj.search);

      console.log('Handling deep link:', path, data);

      // Navigate to the appropriate screen
      if (path.includes('/inbox')) {
        const threadId = params.get('thread') || data?.threadId;
        if (threadId) {
          // Open specific thread
          window.location.hash = `#/inbox?thread=${threadId}`;
        } else {
          // Open inbox with filter
          const filter = params.get('filter') || 'all';
          window.location.hash = `#/inbox?filter=${filter}`;
        }
      } else if (path.includes('/calendar')) {
        const bookingId = params.get('booking') || data?.bookingId;
        if (bookingId) {
          window.location.hash = `#/calendar?booking=${bookingId}`;
        } else {
          window.location.hash = '#/calendar';
        }
      } else {
        // Default to dashboard
        window.location.hash = '#/';
      }

      // Focus the window if it exists
      if (window.focus) {
        window.focus();
      }
    } catch (error) {
      console.error('Failed to handle deep link:', error);
    }
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Update FCM token on server
   */
  async updateToken(token: string): Promise<void> {
    try {
      await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token })
      });
      
      this.fcmToken = token;
    } catch (error) {
      console.error('Failed to update FCM token:', error);
    }
  }

  /**
   * Unregister FCM token (for logout)
   */
  async unregisterToken(): Promise<void> {
    try {
      if (this.fcmToken) {
        await fetch('/api/notifications/unregister', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcm_token: this.fcmToken })
        });
      }
      
      this.fcmToken = null;
    } catch (error) {
      console.error('Failed to unregister FCM token:', error);
    }
  }

  // Helper methods
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private async generateMockFCMToken(): Promise<string> {
    // Mock FCM token generation - in real app, use Firebase SDK
    return `fcm_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();
