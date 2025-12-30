/**
 * API Service - Frontend interface to backend API
 * Replaces direct Gemini API calls with secure backend proxy calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006';

// Get JWT token from localStorage or auth context
const getAuthToken = (): string | null => {
  return localStorage.getItem('soloscale_auth_token');
};

export interface ExtractDocumentResponse {
  document_type: string;
  key_entities: {
    name?: string;
    employer?: string;
    total_income?: number;
    year_to_date_gross?: number;
    ytd_gross?: number;
    year_to_date?: number;
    total_balance?: number;
    account_number?: string;
    ssn?: string;
    address?: string;
    [key: string]: any;
  };
  discrepancy_alerts: Array<{
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  extraction_confidence: number;
  raw_text_preview: string;
}

export interface ChatResponse {
  content: string;
  citations: string[];
}

export interface LeadAnalysisResponse {
  score: number;
  analysis: string;
}

export interface ChaserSMSResponse {
  smsTemplate: string;
}

export interface GeneralDocumentExtractionResponse {
  extracted_data: Record<string, any>;
  confidence: number;
  document_type: string;
  warnings: string[];
}

export interface SMSResponse {
  sid: string;
  status: string;
  message: string;
}

export interface EmailResponse {
  messageId: string;
  message: string;
}

export interface ChaserResponse {
  chaserId: string;
  message: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  variables: string[];
  usage_count: number;
}

export interface Lead {
  id: string;
  account_id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: 'new' | 'in_progress' | 'qualified' | 'closed' | 'lost';
  loan_amount?: number;
  credit_tier?: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  ssn_last_4?: string;
  retirement_priority_score: number;
  assigned_to_user_id?: string;
  assigned_user_name?: string;
  next_follow_up_date?: string;
  tags?: string[];
  total_sessions?: number;
  total_messages?: number;
  chasers_sent?: number;
  chasers_pending?: number;
  last_chaser_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    accountId: string;
  };
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    accountId: string;
  };
}

export class APIService {
  /**
   * Register a new user
   */
  static async register(email: string, password: string, name: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    return await response.json();
  }
  static async extractDocument(
    fileData: string,
    mimeType: string,
    expectedBorrowerName?: string
  ): Promise<ExtractDocumentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/ai/extract-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        fileData,
        mimeType,
        expectedBorrowerName
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Chat with Speed Agent via backend API
   */
  static async chat(
    history: Array<{ role: string; parts: Array<{ text: string }> }>,
    message: string,
    modelToUse?: string
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        history,
        message,
        modelToUse
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Analyze lead urgency via backend API
   */
  static async analyzeLeadUrgency(
    content: string,
    rawSource: string,
    reasoningModel?: string
  ): Promise<LeadAnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/api/ai/analyze-lead-urgency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        content,
        rawSource,
        reasoningModel
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Generate automated chaser SMS via backend API
   */
  static async generateChaserSMS(
    clientName: string,
    brokerName: string,
    missingField: string
  ): Promise<ChaserSMSResponse> {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate-chaser-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        clientName,
        brokerName,
        missingField
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Extract general document data via backend API
   * For documents like paystubs, W-2s, bank statements, tax returns, etc.
   */
  static async extractGeneralDocument(
    fileData: string,
    mimeType: string,
    documentType: 'paystub' | 'w2' | 'bank_statement' | '1003' | 'tax_return' | 'other'
  ): Promise<GeneralDocumentExtractionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/ai/extract-general-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        fileData,
        mimeType,
        documentType
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Send SMS via Twilio
   */
  static async sendSMS(
    to: string,
    message: string,
    from?: string
  ): Promise<SMSResponse> {
    const response = await fetch(`${API_BASE_URL}/api/messaging/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({ to, message, from })
    });

    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Send Email via SendGrid
   */
  static async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: { from?: string; html?: string }
  ): Promise<EmailResponse> {
    const response = await fetch(`${API_BASE_URL}/api/messaging/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        to,
        subject,
        body,
        from: options?.from,
        html: options?.html
      })
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create automated chaser (schedule follow-up SMS/Email)
   */
  static async createChaser(
    leadId: string,
    chaserType: 'sms' | 'email' | 'both',
    reason: string,
    options?: {
      templateId?: string;
      customTemplate?: string;
      scheduledAt?: Date;
    }
  ): Promise<ChaserResponse> {
    const response = await fetch(`${API_BASE_URL}/api/messaging/create-chaser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        leadId,
        chaserType,
        reason,
        templateId: options?.templateId,
        customTemplate: options?.customTemplate,
        scheduledAt: options?.scheduledAt?.toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Chaser creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get message templates
   */
  static async getMessageTemplates(): Promise<MessageTemplate[]> {
    const response = await fetch(`${API_BASE_URL}/api/messaging/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Template fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.templates;
  }

  /**
   * Manually process pending chasers (admin/testing only)
   */
  static async processPendingChasers(): Promise<{ sent: number; failed: number; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/messaging/process-chasers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Chaser processing failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all leads with optional filtering and pagination
   */
  static async getLeads(options?: {
    status?: 'new' | 'in_progress' | 'qualified' | 'closed' | 'lost';
    limit?: number;
    offset?: number;
    sort?: 'urgency' | 'retirement_priority' | 'created_at';
    order?: 'asc' | 'desc';
  }): Promise<LeadsResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.sort) params.append('sort', options.sort);
    if (options?.order) params.append('order', options.order);

    const response = await fetch(`${API_BASE_URL}/api/leads?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Get leads failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get single lead by ID
   */
  static async getLead(id: string): Promise<Lead> {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Get lead failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.lead;
  }

  /**
   * Create new lead
   */
  static async createLead(lead: {
    name: string;
    email: string;
    phone?: string;
    source: string;
    status?: 'new' | 'in_progress' | 'qualified' | 'closed' | 'lost';
    loan_amount?: number;
    credit_tier?: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    ssn_last_4?: string;
    retirement_priority_score?: number;
    assigned_to_user_id?: string;
    tags?: string[];
  }): Promise<Lead> {
    const response = await fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify(lead)
    });

    if (!response.ok) {
      throw new Error(`Create lead failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.lead;
  }

  /**
   * Update lead
   */
  static async updateLead(
    id: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      status?: 'new' | 'in_progress' | 'qualified' | 'closed' | 'lost';
      loan_amount?: number;
      credit_tier?: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
      retirement_priority_score?: number;
      assigned_to_user_id?: string;
      next_follow_up_date?: string;
      tags?: string[];
    }
  ): Promise<Lead> {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Update lead failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.lead;
  }

  /**
   * Delete lead
   */
  static async deleteLead(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Delete lead failed: ${response.statusText}`);
    }
  }

  // Partner Management APIs
  static async getPartnerPerformance(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/partners/performance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Get partner performance failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getPendingReassignments(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/partners/reassignment/pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Get pending reassignments failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async reassignLead(leadId: string, options: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/partners/reassignment/${leadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`Reassign lead failed: ${response.statusText}`);
    }
  }

  static async getTeamOverview(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/partners/team/overview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Get team overview failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
