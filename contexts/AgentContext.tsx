
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, ChatMessage, SystemConfig, User, Subscription } from '../types';
import { APIService } from '../services/apiService';
import { z } from 'zod';

export interface DocumentExtractionResult {
  extracted_data: Record<string, any>;
  confidence: number;
  document_type: string;
  warnings: string[];
}

export interface MortgageExtractionResult {
  document_type: string;
  key_entities: {
    name?: string;
    employer?: string;
    total_income?: number;
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
  automated_chaser?: {
    triggered: boolean;
    reason: string;
    sms_template: string;
  };
}

interface AgentContextType {
  user: User | null;
  subscription: Subscription;
  messages: ChatMessage[];
  leads: Lead[];
  isProcessing: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  sendMessage: (content: string) => Promise<void>;
  processLeadBatch: (rawLeads: Lead[]) => Promise<void>;
  extractDocument: (
    file: File,
    documentType: 'paystub' | 'w2' | 'bank_statement' | '1003' | 'tax_return' | 'other'
  ) => Promise<DocumentExtractionResult>;
  extractMortgageDocument: (
    file: File,
    expectedBorrowerName?: string,
    clientName?: string,
    brokerName?: string
  ) => Promise<MortgageExtractionResult>;
  config: SystemConfig;
  updateConfig: (newConfig: SystemConfig) => void;
  clearHistory: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const STORAGE_KEY = 'soloscale_persistence_v1';

// Zod validation schemas for localStorage data
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'user']),
  avatar: z.string().url().optional()
});

const SubscriptionSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  status: z.enum(['active', 'inactive', 'canceled']),
  usageLimit: z.number().int().min(0),
  currentUsage: z.number().int().min(0),
  renewsAt: z.string().datetime()
});

const LeadSchema = z.object({
  id: z.string(),
  content: z.string(),
  rawSource: z.string(),
  status: z.enum(['new', 'processing', 'processed']),
  urgencyScore: z.number().min(0).max(100).optional(),
  analysis: z.string().optional()
});

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'model']),
  content: z.string(),
  timestamp: z.number(),
  citations: z.array(z.string()).optional()
});

const SystemConfigSchema = z.object({
  brain: z.object({
    useSearchGrounding: z.boolean(),
    reasoningModel: z.string(),
    speedModel: z.string()
  }),
  model: z.string(),
  active: z.boolean(),
  enableRealTimeSearch: z.boolean(),
  greetingTemplate: z.string(),
  urgencyKeywords: z.object({
    timeline: z.array(z.string()),
    financial: z.array(z.string()),
    motivation: z.array(z.string())
  }),
  officeHours: z.object({
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    days: z.array(z.string()),
    autoResponderMessage: z.string()
  })
});

const DEFAULT_CONFIG: SystemConfig = {
  brain: {
    useSearchGrounding: true,
    reasoningModel: 'models/gemini-2.0-flash-exp',
    speedModel: 'models/gemini-2.0-flash-exp'
  },
  model: 'models/gemini-2.0-flash-exp',
  active: true,
  enableRealTimeSearch: true,
  greetingTemplate: 'Hi, I am [Name], your SoloScale assistant.',
  urgencyKeywords: {
    timeline: ['soon', 'fast', 'quick', 'asap'],
    financial: ['cash', 'pre-approved', 'budget'],
    motivation: ['moving', 'relocating', 'job']
  },
  officeHours: {
    enabled: true,
    startTime: '09:00',
    endTime: '18:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    autoResponderMessage: 'Our agents are currently offline. We will reach out during business hours.'
  }
};

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      // Validate with Zod schema to prevent XSS/injection attacks
      return UserSchema.parse(parsed);
    } catch (error) {
      console.warn('Invalid user data in localStorage, clearing:', error);
      localStorage.removeItem(`${STORAGE_KEY}_user`);
      return null;
    }
  });

  const [subscription, setSubscription] = useState<Subscription>(() => {
    const defaultSub: Subscription = {
      plan: 'pro',
      status: 'active',
      usageLimit: 500,
      currentUsage: 42,
      renewsAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sub`);
      if (!saved) return defaultSub;

      const parsed = JSON.parse(saved);
      // Validate with Zod schema
      return SubscriptionSchema.parse(parsed);
    } catch (error) {
      console.warn('Invalid subscription data in localStorage, using default:', error);
      localStorage.removeItem(`${STORAGE_KEY}_sub`);
      return defaultSub;
    }
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_leads`);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      // Validate array of leads
      return z.array(LeadSchema).parse(parsed);
    } catch (error) {
      console.warn('Invalid leads data in localStorage, clearing:', error);
      localStorage.removeItem(`${STORAGE_KEY}_leads`);
      return [];
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_messages`);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      // Validate array of messages
      return z.array(ChatMessageSchema).parse(parsed);
    } catch (error) {
      console.warn('Invalid messages data in localStorage, clearing:', error);
      localStorage.removeItem(`${STORAGE_KEY}_messages`);
      return [];
    }
  });

  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
      if (!saved) return DEFAULT_CONFIG;

      const parsed = JSON.parse(saved);
      // Validate config schema
      return SystemConfigSchema.parse(parsed);
    } catch (error) {
      console.warn('Invalid config data in localStorage, using default:', error);
      localStorage.removeItem(`${STORAGE_KEY}_config`);
      return DEFAULT_CONFIG;
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Debounced localStorage sync with cleanup to prevent memory leaks
  useEffect(() => {
    // Debounce localStorage writes to avoid excessive writes
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
      localStorage.setItem(`${STORAGE_KEY}_sub`, JSON.stringify(subscription));

      // Limit leads to last 100 to prevent localStorage size issues
      const recentLeads = leads.slice(-100);
      localStorage.setItem(`${STORAGE_KEY}_leads`, JSON.stringify(recentLeads));

      // Limit messages to last 50 to prevent localStorage size issues
      const recentMessages = messages.slice(-50);
      localStorage.setItem(`${STORAGE_KEY}_messages`, JSON.stringify(recentMessages));

      localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
    }, 500); // Debounce for 500ms

    // Cleanup function to cancel pending writes when component unmounts or deps change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, subscription, leads, messages, config]);

  const login = useCallback(async (email: string) => {
    try {
      // Try to login first with a default password
      const loginResponse = await APIService.login(email, 'password123');
      
      // Store the JWT token
      localStorage.setItem('soloscale_auth_token', loginResponse.token);
      
      // Set user from response
      setUser({
        id: loginResponse.user.id,
        name: loginResponse.user.name,
        email: loginResponse.user.email,
        role: loginResponse.user.role,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + loginResponse.user.name
      });
    } catch (loginError) {
      try {
        // If login fails, try to register the user
        const registerResponse = await APIService.register(email, 'password123', email.split('@')[0]);
        
        // Store the JWT token
        localStorage.setItem('soloscale_auth_token', registerResponse.token);
        
        // Set user from response
        setUser({
          id: registerResponse.user.id,
          name: registerResponse.user.name,
          email: registerResponse.user.email,
          role: registerResponse.user.role,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + registerResponse.user.name
        });
      } catch (registerError) {
        // If both fail, fall back to mock user for development
        console.warn('Authentication failed, using mock user:', loginError, registerError);
        setUser({
          id: 'u_' + Math.random().toString(36).substr(2, 9),
          name: email.split('@')[0],
          email: email,
          role: 'owner',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email.split('@')[0]
        });
      }
    }
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const updateConfig = useCallback((newConfig: SystemConfig) => {
    const syncedConfig = {
      ...newConfig,
      brain: {
        ...newConfig.brain,
        speedModel: newConfig.model,
        useSearchGrounding: newConfig.enableRealTimeSearch
      }
    };
    setConfig(syncedConfig);
    // Config is now used directly by backend API calls
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setLeads([]);
  }, []);

  const incrementUsage = useCallback((amount: number) => {
    setSubscription(prev => ({
      ...prev,
      currentUsage: prev.currentUsage + amount
    }));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    setIsProcessing(true);
    console.log('Sending message:', content);
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Use secure backend API instead of direct Gemini calls
      const response = await APIService.chat(history, content, config.brain.speedModel);
      console.log('Response received:', response);
      incrementUsage(1);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.content,
        citations: response.citations,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [messages, config.brain.speedModel, incrementUsage]);

  const processLeadBatch = useCallback(async (rawLeads: Lead[]) => {
    setIsProcessing(true);
    const initializedLeads = rawLeads.map(l => ({ ...l, status: 'new' as const }));
    setLeads(prev => [...prev, ...initializedLeads]);

    // Process leads in batches of 10 for better performance (10x faster than sequential)
    const BATCH_SIZE = 10;

    for (let i = 0; i < initializedLeads.length; i += BATCH_SIZE) {
      const batch = initializedLeads.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchPromises = batch.map(async (lead) => {
        try {
          // Use secure backend API instead of direct Gemini calls
          const analysis = await APIService.analyzeLeadUrgency(
            lead.content,
            lead.rawSource,
            config.brain.reasoningModel
          );
          incrementUsage(2);

          return {
            leadId: lead.id,
            urgencyScore: analysis.score,
            analysis: analysis.analysis,
            status: 'processed' as const,
            error: null
          };
        } catch (e) {
          console.error("Analysis for lead failed:", lead.id, e);
          return {
            leadId: lead.id,
            urgencyScore: undefined,
            analysis: undefined,
            status: 'new' as const,
            error: e
          };
        }
      });

      // Wait for entire batch to complete
      const results = await Promise.all(batchPromises);

      // Update all leads in batch at once
      setLeads(prev => prev.map(l => {
        const result = results.find(r => r.leadId === l.id);
        if (result && !result.error) {
          return {
            ...l,
            urgencyScore: result.urgencyScore,
            analysis: result.analysis,
            status: result.status
          };
        }
        return l;
      }));

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < initializedLeads.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setIsProcessing(false);
  }, [config.brain.reasoningModel, incrementUsage]);

  const extractDocument = useCallback(async (
    file: File,
    documentType: 'paystub' | 'w2' | 'bank_statement' | '1003' | 'tax_return' | 'other'
  ): Promise<DocumentExtractionResult> => {
    setIsProcessing(true);
    console.log('Extracting document:', file.name, 'Type:', documentType);

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Use secure backend API instead of direct Gemini calls
      const result = await APIService.extractGeneralDocument(
        base64Data,
        file.type,
        documentType
      );

      incrementUsage(3); // Document extraction uses more tokens
      console.log('Document extraction complete:', result);

      return result;
    } catch (error) {
      console.error("Document extraction error:", error);
      return {
        extracted_data: {},
        confidence: 0,
        document_type: documentType,
        warnings: ['Failed to process document: ' + (error as Error).message]
      };
    } finally {
      setIsProcessing(false);
    }
  }, [incrementUsage]);

  /**
   * AUTOMATED CHASER LOGIC
   * Extracts mortgage documents and automatically generates SMS templates
   * when critical fields (like Year-to-Date income) are missing
   */
  const extractMortgageDocument = useCallback(async (
    file: File,
    expectedBorrowerName?: string,
    clientName?: string,
    brokerName?: string
  ): Promise<MortgageExtractionResult> => {
    setIsProcessing(true);
    console.log('Extracting mortgage document:', file.name);

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Use secure backend API instead of direct Gemini calls
      const result = await APIService.extractDocument(
        base64Data,
        file.type,
        expectedBorrowerName
      );

      incrementUsage(3);
      console.log('Mortgage extraction complete:', result);

      // AUTOMATED CHASER: Check for missing Year-to-Date on paystubs
      let automatedChaser: MortgageExtractionResult['automated_chaser'] = undefined;

      if (result.document_type.toLowerCase().includes('paystub')) {
        const hasYTD = result.key_entities.year_to_date_gross !== undefined ||
                       result.key_entities.ytd_gross !== undefined ||
                       result.key_entities.year_to_date !== undefined;

        if (!hasYTD) {
          console.log('🤖 Automated Chaser: Missing YTD data on paystub');

          // Generate polite SMS template using secure backend API
          const smsResponse = await APIService.generateChaserSMS(
            clientName || result.key_entities.name || 'Client',
            brokerName || user?.name || 'Your mortgage broker',
            'Year-to-Date income total'
          );

          automatedChaser = {
            triggered: true,
            reason: 'Missing Year-to-Date (YTD) income total on paystub',
            sms_template: smsResponse.smsTemplate
          };

          incrementUsage(1); // AI-generated SMS
        }
      }

      return {
        ...result,
        automated_chaser: automatedChaser
      };
    } catch (error) {
      console.error("Mortgage extraction error:", error);
      return {
        document_type: "Error",
        key_entities: {},
        discrepancy_alerts: [{
          field: "extraction",
          issue: "Failed to extract data: " + (error as Error).message,
          severity: "high"
        }],
        extraction_confidence: 0,
        raw_text_preview: "",
        automated_chaser: undefined
      };
    } finally {
      setIsProcessing(false);
    }
  }, [user, incrementUsage]);


  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    subscription,
    messages,
    leads,
    isProcessing,
    login,
    logout,
    sendMessage,
    processLeadBatch,
    extractDocument,
    extractMortgageDocument,
    config,
    updateConfig,
    clearHistory
  }), [
    user,
    subscription,
    messages,
    leads,
    isProcessing,
    login,
    logout,
    sendMessage,
    processLeadBatch,
    extractDocument,
    extractMortgageDocument,
    config,
    updateConfig,
    clearHistory
  ]);

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error("useAgent must be used within AgentProvider");
  return context;
};
