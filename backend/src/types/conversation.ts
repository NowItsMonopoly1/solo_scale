export interface Conversation {
  id: string;
  account_id: string;
  lead_id?: string;
  realtor_id?: string;
  subject?: string;
  status: 'active' | 'closed' | 'archived';
  ai_summary?: string;
  ai_summary_generated_at?: Date;
  message_count: number;
  last_message_at?: Date;
  closed_at?: Date;
  closed_by?: string;
  close_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  account_id: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email';
  from_number?: string;
  to_number?: string;
  from_email?: string;
  to_email?: string;
  subject?: string;
  body: string;
  ai_generated: boolean;
  ai_compliance_status?: 'ok' | 'warning' | 'blocked';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  provider_message_id?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  sent_at?: Date;
  delivered_at?: Date;
}

export interface CreateConversationRequest {
  lead_id?: string;
  realtor_id?: string;
  subject?: string;
}

export interface CloseConversationRequest {
  close_reason?: string;
  user_id: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationSummaryPrompt {
  conversation_id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}
