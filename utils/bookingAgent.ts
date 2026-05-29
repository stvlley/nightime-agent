// Booking Agent Core Logic
import { 
  Thread, 
  Message, 
  TimeSlot, 
  TimeSlotOffer, 
  Booking, 
  ThreadState, 
  MessageIntent,
  BookingAgentConfig,
  ThreadStateTransitions 
} from '@/types/booking';

export class BookingAgent {
  private config: BookingAgentConfig;
  
  constructor(config: BookingAgentConfig) {
    this.config = config;
  }

  /**
   * Main entry point for processing inbound messages
   */
  async processInboundMessage(thread: Thread, message: Message): Promise<{
    newState: ThreadState;
    actions: AgentAction[];
    requiresApproval: boolean;
  }> {
    console.log(`Processing message for thread ${thread.id}, current state: ${thread.state}`);
    
    // Apply content filtering
    const filteredText = await this.applyContentFilter(message.text);
    message.filteredText = filteredText;

    // Classify message intent
    const intent = await this.classifyIntent(filteredText, thread);
    message.aiLabel = intent;

    // Check if this matches any FAQ
    if (intent === 'faq') {
      const faqResponse = await this.getFAQResponse(filteredText, thread.userId);
      if (faqResponse) {
        return {
          newState: thread.state,
          actions: [{ type: 'send_message', payload: { text: faqResponse } }],
          requiresApproval: false
        };
      }
    }

    // Route to appropriate handler based on current state and intent
    return await this.routeMessage(thread, message, intent);
  }

  /**
   * Route message based on thread state and message intent
   */
  private async routeMessage(
    thread: Thread, 
    message: Message, 
    intent: MessageIntent
  ): Promise<{
    newState: ThreadState;
    actions: AgentAction[];
    requiresApproval: boolean;
  }> {
    const currentState = thread.state;

    switch (intent) {
      case 'booking':
        return await this.handleBookingIntent(thread, message);
        
      case 'cancel':
        return await this.handleCancellationIntent(thread, message);
        
      case 'reschedule':
        return await this.handleRescheduleIntent(thread, message);
        
      default:
        // Check if we're awaiting client response
        if (currentState === 'AWAITING_CLIENT') {
          return await this.handleSlotSelection(thread, message);
        }
        
        // Default to manual approval for unclassified messages
        return {
          newState: currentState,
          actions: [{ 
            type: 'request_approval', 
            payload: { 
              suggestedResponse: await this.generatePoliteResponse(message.filteredText || message.text)
            } 
          }],
          requiresApproval: true
        };
    }
  }

  /**
   * Handle booking intent - extract details and offer slots
   */
  private async handleBookingIntent(thread: Thread, message: Message): Promise<{
    newState: ThreadState;
    actions: AgentAction[];
    requiresApproval: boolean;
  }> {
    try {
      // Extract booking details from message
      const bookingDetails = await this.extractBookingDetails(message.filteredText || message.text);
      
      // Compute available time slots
      const slots = await this.computeAvailableSlots(thread.userId, bookingDetails);
      
      if (slots.length === 0) {
        return {
          newState: 'OPEN',
          actions: [{
            type: 'send_message',
            payload: {
              text: "I don't have any availability for your requested time. Would you like me to suggest some alternative times?"
            }
          }],
          requiresApproval: false
        };
      }

      // Create slot offer
      const offer = await this.createSlotOffer(thread.id, slots, bookingDetails);
      
      // Format response with slot options
      const response = this.formatSlotOfferMessage(slots);
      
      return {
        newState: 'AWAITING_CLIENT',
        actions: [
          { type: 'send_message', payload: { text: response } },
          { type: 'save_offer', payload: { offer } }
        ],
        requiresApproval: false
      };
      
    } catch (error) {
      console.error('Error handling booking intent:', error);
      
      return {
        newState: 'OPEN',
        actions: [{
          type: 'request_approval',
          payload: {
            suggestedResponse: "I'd be happy to help you schedule an appointment. Could you let me know your preferred date and time?"
          }
        }],
        requiresApproval: true
      };
    }
  }

  /**
   * Handle slot selection when client chooses from offered options
   */
  private async handleSlotSelection(thread: Thread, message: Message): Promise<{
    newState: ThreadState;
    actions: AgentAction[];
    requiresApproval: boolean;
  }> {
    const offer = thread.pendingOffer;
    if (!offer) {
      return {
        newState: 'OPEN',
        actions: [{
          type: 'send_message',
          payload: { text: "I don't have any pending slot offers. Would you like to make a new booking?" }
        }],
        requiresApproval: false
      };
    }

    // Parse client's selection
    const selectedSlot = this.parseSlotSelection(message.filteredText || message.text, offer.slots);
    
    if (!selectedSlot) {
      return {
        newState: 'AWAITING_CLIENT',
        actions: [{
          type: 'send_message',
          payload: { 
            text: "I didn't understand your selection. Please reply with the number of your preferred time slot (1, 2, or 3)." 
          }
        }],
        requiresApproval: false
      };
    }

    // Revalidate slot availability
    const isStillAvailable = await this.validateSlotAvailability(thread.userId, selectedSlot);
    
    if (!isStillAvailable) {
      // Slot is no longer available, offer fresh alternatives
      const newSlots = await this.computeAvailableSlots(thread.userId, {
        preferredDate: selectedSlot.start,
        duration: selectedSlot.duration
      });
      
      return {
        newState: 'OFFERING',
        actions: [{
          type: 'send_message',
          payload: {
            text: `Sorry, that time slot is no longer available. Here are some alternatives:\n\n${this.formatSlotOfferMessage(newSlots)}`
          }
        }],
        requiresApproval: false
      };
    }

    // Create booking and calendar event
    const booking = await this.createBooking(thread, selectedSlot);
    const confirmationMessage = this.formatConfirmationMessage(booking);
    
    return {
      newState: 'CONFIRMED',
      actions: [
        { type: 'create_calendar_event', payload: { booking } },
        { type: 'send_message', payload: { text: confirmationMessage } },
        { type: 'notify_provider', payload: { type: 'booking_confirmed', booking } }
      ],
      requiresApproval: false
    };
  }

  /**
   * Handle cancellation requests
   */
  private async handleCancellationIntent(thread: Thread, message: Message): Promise<{
    newState: ThreadState;
    actions: AgentAction[];
    requiresApproval: boolean;
  }> {
    // Find active booking for this thread
    const activeBooking = await this.findActiveBooking(thread.id);
    
    if (!activeBooking) {
      return {
        newState: 'OPEN',
        actions: [{
          type: 'send_message',
          payload: { text: "I don't see any active bookings to cancel. Is there something specific I can help you with?" }
        }],
        requiresApproval: false
      };
    }

    // Cancel the booking
    const cancellationConfirmed = await this.cancelBooking(activeBooking.id);
    
    if (cancellationConfirmed) {
      // Offer rebooking options
      const rebookingSlots = await this.computeAvailableSlots(thread.userId, {
        duration: activeBooking.duration,
        service: activeBooking.service
      });

      const actions: AgentAction[] = [
        { type: 'cancel_calendar_event', payload: { eventId: activeBooking.calendarEventId } },
        { type: 'send_message', payload: { text: this.formatCancellationMessage(activeBooking, rebookingSlots) } }
      ];

      // Schedule follow-up messages if enabled
      if (this.config.settings.followUpSettings.enabledTypes.includes('cancelled')) {
        actions.push({
          type: 'schedule_follow_up',
          payload: {
            type: 'cancelled',
            delayHours: this.config.settings.followUpSettings.delays.firstFollowUp
          }
        });
      }

      return {
        newState: 'CANCELLED',
        actions,
        requiresApproval: false
      };
    }

    return {
      newState: thread.state,
      actions: [{
        type: 'request_approval',
        payload: { suggestedResponse: "I had trouble processing your cancellation. Let me get someone to help you right away." }
      }],
      requiresApproval: true
    };
  }

  /**
   * Extract booking details from natural language text
   */
  private async extractBookingDetails(text: string): Promise<{
    preferredDate?: string;
    preferredTime?: string;
    duration?: number;
    service?: string;
    urgency?: 'today' | 'tomorrow' | 'this_week' | 'flexible';
  }> {
    // This would use AI/NLP to extract structured data from text
    // For now, implementing basic pattern matching
    
    const details: any = {};
    
    // Extract time patterns
    const timePatterns = [
      /(\d{1,2}):?(\d{2})?\s*(am|pm)/gi,
      /(\d{1,2})\s*(am|pm)/gi,
      /(morning|afternoon|evening|night)/gi
    ];
    
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        details.preferredTime = match[0];
        break;
      }
    }
    
    // Extract date patterns
    const datePatterns = [
      /(today|tomorrow|tonight)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(\d{1,2}\/\d{1,2})/gi,
      /(next week|this week)/gi
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        details.preferredDate = match[0];
        break;
      }
    }
    
    // Extract duration
    const durationPatterns = [
      /(\d+)\s*(hour|hr|minute|min)/gi,
      /(30|60|90)\s*min/gi
    ];
    
    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        details.duration = unit.includes('hour') ? num * 60 : num;
        break;
      }
    }
    
    return details;
  }

  /**
   * Compute available time slots based on user availability and calendar
   */
  private async computeAvailableSlots(
    userId: string, 
    preferences: any = {}
  ): Promise<TimeSlot[]> {
    try {
      // This would integrate with Google Calendar API and user's availability settings
      // For now, return mock slots
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      const mockSlots: TimeSlot[] = [
        {
          id: '1',
          start: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
          end: new Date(tomorrow.setHours(11, 0, 0, 0)).toISOString(),
          duration: 60,
          available: true
        },
        {
          id: '2', 
          start: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString(),
          end: new Date(tomorrow.setHours(15, 0, 0, 0)).toISOString(),
          duration: 60,
          available: true
        },
        {
          id: '3',
          start: new Date(tomorrow.setHours(16, 30, 0, 0)).toISOString(),
          end: new Date(tomorrow.setHours(17, 30, 0, 0)).toISOString(),
          duration: 60,
          available: true
        }
      ];
      
      return mockSlots.slice(0, this.config.settings.maxOfferedSlots || 3);
      
    } catch (error) {
      console.error('Error computing available slots:', error);
      return [];
    }
  }

  /**
   * Format slot offer message for client
   */
  private formatSlotOfferMessage(slots: TimeSlot[]): string {
    if (slots.length === 0) {
      return "I don't have any available slots at the moment. Please let me know if you'd like to check for different times.";
    }

    let message = "Here are my available times:\n\n";
    
    slots.forEach((slot, index) => {
      const date = new Date(slot.start);
      const timeStr = date.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      message += `${index + 1}. ${timeStr} (${slot.duration} minutes)\n`;
    });
    
    message += "\nPlease reply with the number of your preferred time (1, 2, or 3).";
    
    return message;
  }

  /**
   * Parse client's slot selection from their response
   */
  private parseSlotSelection(text: string, availableSlots: TimeSlot[]): TimeSlot | null {
    // Look for number selection (1, 2, 3, etc.)
    const numberMatch = text.match(/\b([1-9])\b/);
    if (numberMatch) {
      const choice = parseInt(numberMatch[1]) - 1;
      if (choice >= 0 && choice < availableSlots.length) {
        return availableSlots[choice];
      }
    }
    
    // Look for time-based selection
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (timeMatch) {
      const selectedTime = timeMatch[0];
      return availableSlots.find(slot => {
        const slotTime = new Date(slot.start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        return slotTime.toLowerCase().includes(selectedTime.toLowerCase());
      }) || null;
    }
    
    return null;
  }

  // Additional helper methods would go here...
  private async classifyIntent(text: string, thread: Thread): Promise<MessageIntent> {
    // Mock implementation - would use AI classification
    const bookingKeywords = ['book', 'appointment', 'schedule', 'available', 'time'];
    const cancelKeywords = ['cancel', 'cancelled', 'can\'t make it'];
    const rescheduleKeywords = ['reschedule', 'change', 'move', 'different time'];
    
    const lowerText = text.toLowerCase();
    
    if (cancelKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'cancel';
    }
    
    if (rescheduleKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'reschedule';
    }
    
    if (bookingKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'booking';
    }
    
    return 'other';
  }

  private async applyContentFilter(text: string): Promise<string> {
    // Mock implementation - would integrate with content filtering service
    return text;
  }

  private async getFAQResponse(text: string, userId: string): Promise<string | null> {
    // Mock implementation - would query user's FAQ database
    return null;
  }

  private async generatePoliteResponse(text: string): Promise<string> {
    return "Thank you for your message. I'll have someone get back to you shortly.";
  }

  private async createSlotOffer(threadId: string, slots: TimeSlot[], context: any): Promise<TimeSlotOffer> {
    return {
      id: `offer_${Date.now()}`,
      threadId,
      slots,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      context,
      createdAt: new Date().toISOString()
    };
  }

  private async validateSlotAvailability(userId: string, slot: TimeSlot): Promise<boolean> {
    // Mock implementation - would check Google Calendar
    return true;
  }

  private async createBooking(thread: Thread, slot: TimeSlot): Promise<Booking> {
    return {
      id: `booking_${Date.now()}`,
      userId: thread.userId,
      threadId: thread.id,
      clientHandle: thread.clientHandle,
      service: 'Massage Session',
      start: slot.start,
      end: slot.end,
      duration: slot.duration,
      price: slot.price || 80,
      status: 'confirmed',
      paid: false,
      source: 'ai',
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      metadata: {
        originalSlotOfferId: thread.pendingOffer?.id
      }
    };
  }

  private formatConfirmationMessage(booking: Booking): string {
    const date = new Date(booking.start);
    const timeStr = date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',  
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `Perfect! Your ${booking.service} is confirmed for ${timeStr}. I'll send you a reminder 24 hours before your appointment. Looking forward to seeing you!`;
  }

  private formatCancellationMessage(booking: Booking, rebookingSlots: TimeSlot[]): string {
    let message = `Your appointment on ${new Date(booking.start).toLocaleDateString()} has been cancelled.`;
    
    if (rebookingSlots.length > 0) {
      message += '\n\nWould you like to reschedule? Here are some available times:\n\n';
      message += this.formatSlotOfferMessage(rebookingSlots);
    }
    
    return message;
  }

  private async findActiveBooking(threadId: string): Promise<Booking | null> {
    // Mock implementation
    return null;
  }

  private async cancelBooking(bookingId: string): Promise<boolean> {
    // Mock implementation
    return true;
  }

  private async handleRescheduleIntent(thread: Thread, message: Message): Promise<{
    newState: ThreadState;
    actions: AgentAction[];
    requiresApproval: boolean;
  }> {
    // Implementation for reschedule logic
    return {
      newState: 'OFFERING',
      actions: [],
      requiresApproval: false
    };
  }
}

export interface AgentAction {
  type: 'send_message' | 'request_approval' | 'save_offer' | 'create_calendar_event' | 
        'cancel_calendar_event' | 'notify_provider' | 'schedule_follow_up';
  payload: any;
}