// Chat parsers for different messaging platforms
export interface ParsedMessage {
  timestamp: string;
  sender: string;
  message: string;
  isFromClient: boolean;
}

export interface ParsedConversation {
  platform: string;
  clientName: string;
  clientPhone?: string;
  messages: ParsedMessage[];
  totalMessages: number;
  dateRange: {
    start: string;
    end: string;
  };
}

// WhatsApp chat parser (.txt format)
export const parseWhatsAppChat = (content: string): ParsedConversation => {
  const lines = content.split('\n').filter(line => line.trim());
  const messages: ParsedMessage[] = [];
  let clientName = 'Unknown Client';
  
  // WhatsApp format: [DD/MM/YYYY, HH:MM:SS] Contact Name: Message
  const whatsappRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{4}),?\s*(\d{1,2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)$/;
  
  for (const line of lines) {
    const match = line.match(whatsappRegex);
    if (match) {
      const [, date, time, sender, message] = match;
      const timestamp = `${date} ${time}`;
      
      // Assume first sender is the business owner, others are clients
      const isFromClient = sender !== clientName && messages.length === 0 ? false : sender !== 'You';
      if (isFromClient && clientName === 'Unknown Client') {
        clientName = sender.trim();
      }
      
      messages.push({
        timestamp,
        sender: sender.trim(),
        message: message.trim(),
        isFromClient,
      });
    }
  }

  return {
    platform: 'WhatsApp',
    clientName,
    messages,
    totalMessages: messages.length,
    dateRange: {
      start: messages[0]?.timestamp || '',
      end: messages[messages.length - 1]?.timestamp || '',
    },
  };
};

// Google Voice SMS parser (.json format)
export const parseGoogleVoiceChat = (content: string): ParsedConversation => {
  try {
    const data = JSON.parse(content);
    const messages: ParsedMessage[] = [];
    let clientName = 'Unknown Client';
    let clientPhone = '';

    // Google Voice format varies, but typically has messages array
    const messageArray = data.messages || data.conversations?.[0]?.messages || [];
    
    for (const msg of messageArray) {
      const isFromClient = msg.direction === 'incoming' || msg.type === 'received';
      
      if (isFromClient && !clientPhone) {
        clientPhone = msg.from || msg.phoneNumber || '';
        clientName = msg.contactName || clientPhone;
      }

      messages.push({
        timestamp: msg.timestamp || msg.date || new Date().toISOString(),
        sender: isFromClient ? clientName : 'You',
        message: msg.text || msg.content || '',
        isFromClient,
      });
    }

    return {
      platform: 'Google Voice',
      clientName,
      clientPhone,
      messages,
      totalMessages: messages.length,
      dateRange: {
        start: messages[0]?.timestamp || '',
        end: messages[messages.length - 1]?.timestamp || '',
      },
    };
  } catch (error) {
    throw new Error('Invalid Google Voice JSON format');
  }
};

// Telegram chat parser (.csv format)
export const parseTelegramChat = (content: string): ParsedConversation => {
  const lines = content.split('\n').filter(line => line.trim());
  const messages: ParsedMessage[] = [];
  let clientName = 'Unknown Client';
  
  // Skip header row if present
  const dataLines = lines[0].includes('Date,Time,Sender,Message') ? lines.slice(1) : lines;
  
  for (const line of dataLines) {
    const columns = line.split(',');
    if (columns.length >= 4) {
      const [date, time, sender, ...messageParts] = columns;
      const message = messageParts.join(',').replace(/"/g, '');
      const timestamp = `${date} ${time}`;
      
      const isFromClient = sender !== 'You' && sender !== 'Me';
      if (isFromClient && clientName === 'Unknown Client') {
        clientName = sender.trim();
      }
      
      messages.push({
        timestamp,
        sender: sender.trim(),
        message: message.trim(),
        isFromClient,
      });
    }
  }

  return {
    platform: 'Telegram',
    clientName,
    messages,
    totalMessages: messages.length,
    dateRange: {
      start: messages[0]?.timestamp || '',
      end: messages[messages.length - 1]?.timestamp || '',
    },
  };
};

// Email conversation parser (.eml or .mbox format)
export const parseEmailConversation = (content: string): ParsedConversation => {
  const messages: ParsedMessage[] = [];
  let clientName = 'Unknown Client';
  let clientEmail = '';
  
  // Simple email parsing - look for From:, Date:, and message content
  const emailBlocks = content.split(/(?=From:|Date:)/);
  
  for (const block of emailBlocks) {
    const fromMatch = block.match(/From:\s*(.+?)(?:\n|$)/);
    const dateMatch = block.match(/Date:\s*(.+?)(?:\n|$)/);
    const subjectMatch = block.match(/Subject:\s*(.+?)(?:\n|$)/);
    
    // Extract message content (everything after headers)
    const contentMatch = block.match(/\n\n([\s\S]+)/);
    
    if (fromMatch && dateMatch && contentMatch) {
      const sender = fromMatch[1].trim();
      const isFromClient = !sender.includes('noreply') && !sender.includes('your-business');
      
      if (isFromClient && clientName === 'Unknown Client') {
        clientName = sender.split('<')[0].trim() || sender;
        clientEmail = sender.match(/<(.+)>/)?.[1] || sender;
      }
      
      messages.push({
        timestamp: dateMatch[1].trim(),
        sender: isFromClient ? clientName : 'You',
        message: contentMatch[1].trim(),
        isFromClient,
      });
    }
  }

  return {
    platform: 'Email',
    clientName,
    clientPhone: clientEmail,
    messages,
    totalMessages: messages.length,
    dateRange: {
      start: messages[0]?.timestamp || '',
      end: messages[messages.length - 1]?.timestamp || '',
    },
  };
};

// Main parser function that detects format and routes to appropriate parser
export const parseConversationFile = (filename: string, content: string): ParsedConversation => {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'txt':
      return parseWhatsAppChat(content);
    case 'json':
      return parseGoogleVoiceChat(content);
    case 'csv':
      return parseTelegramChat(content);
    case 'eml':
    case 'mbox':
      return parseEmailConversation(content);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
};

// Extract insights from parsed conversations for AI training
export const extractConversationInsights = (conversation: ParsedConversation) => {
  const insights = {
    commonQuestions: [] as string[],
    businessResponses: [] as string[],
    bookingPatterns: [] as string[],
    serviceInquiries: [] as string[],
    pricingQuestions: [] as string[],
  };

  const businessMessages = conversation.messages.filter(msg => !msg.isFromClient);
  const clientMessages = conversation.messages.filter(msg => msg.isFromClient);

  // Extract common client questions
  clientMessages.forEach(msg => {
    const message = msg.message.toLowerCase();
    
    if (message.includes('?')) {
      insights.commonQuestions.push(msg.message);
    }
    
    if (message.includes('book') || message.includes('appointment') || message.includes('schedule')) {
      insights.bookingPatterns.push(msg.message);
    }
    
    if (message.includes('service') || message.includes('massage') || message.includes('therapy')) {
      insights.serviceInquiries.push(msg.message);
    }
    
    if (message.includes('price') || message.includes('cost') || message.includes('rate') || message.includes('$')) {
      insights.pricingQuestions.push(msg.message);
    }
  });

  // Extract business response patterns
  businessMessages.forEach(msg => {
    insights.businessResponses.push(msg.message);
  });

  return insights;
};