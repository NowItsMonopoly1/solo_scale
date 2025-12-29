import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/index.js';

export type AIProvider = 'gemini' | 'claude';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

/**
 * AI Provider Abstraction Layer
 * Supports both Gemini and Claude for flexibility
 */
export class AIService {
  private gemini: GoogleGenAI | null = null;
  private claude: Anthropic | null = null;

  constructor() {
    if (config.ai.geminiApiKey) {
      this.gemini = new GoogleGenAI({ apiKey: config.ai.geminiApiKey });
    }

    if (config.ai.anthropicApiKey) {
      this.claude = new Anthropic({ apiKey: config.ai.anthropicApiKey });
    }
  }

  /**
   * Generate conversation summary using AI
   */
  async generateConversationSummary(
    messages: AIMessage[],
    provider: AIProvider = 'gemini'
  ): Promise<AIResponse> {
    const systemPrompt = `You are an AI assistant that summarizes mortgage lead conversations.

Analyze the conversation and provide a concise summary that includes:
1. Main topic/purpose of the conversation
2. Key questions or concerns raised
3. Current status or next steps
4. Urgency level (low/medium/high)

Format the summary in 3-4 sentences maximum. Be professional and factual.`;

    const formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    if (provider === 'gemini' && this.gemini) {
      return await this.callGemini(formattedMessages);
    } else if (provider === 'claude' && this.claude) {
      return await this.callClaude(formattedMessages);
    }

    throw new Error(`AI provider ${provider} not configured`);
  }

  /**
   * Score lead urgency (0-100)
   */
  async scoreLeadUrgency(
    leadContent: string,
    conversationHistory?: string
  ): Promise<{ score: number; analysis: string }> {
    const prompt = `Act as a Senior Mortgage Underwriter. Analyze this lead and determine their urgency to purchase or refinance.

LEAD CONTENT: "${leadContent}"
${conversationHistory ? `CONVERSATION HISTORY: "${conversationHistory}"` : ''}

Determine an urgency score (0-100) and provide a one-sentence summary of your analysis.

Respond in JSON format: {"score": <number>, "analysis": "<string>"}`;

    const response = await this.callGemini([
      { role: 'user', content: prompt },
    ]);

    try {
      const parsed = JSON.parse(response.content);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        analysis: parsed.analysis || 'Unable to analyze.',
      };
    } catch {
      return { score: 0, analysis: 'Failed to parse AI response.' };
    }
  }

  /**
   * Check message compliance
   */
  async checkCompliance(
    messageBody: string
  ): Promise<'ok' | 'warning' | 'blocked'> {
    const prompt = `You are a TRID/RESPA compliance checker for mortgage communications.

Analyze this message for compliance issues:
"${messageBody}"

Rules:
- No fee disclosures unless sourced from LOS
- No illegal co-marketing
- No misleading rate promises
- Professional tone required

Respond with ONE word only: "ok", "warning", or "blocked"`;

    const response = await this.callGemini([
      { role: 'user', content: prompt },
    ]);

    const result = response.content.trim().toLowerCase();
    if (['ok', 'warning', 'blocked'].includes(result)) {
      return result as 'ok' | 'warning' | 'blocked';
    }

    return 'warning'; // Default to warning if unclear
  }

  private async callGemini(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.gemini) {
      throw new Error('Gemini API not configured');
    }

    const model = 'models/gemini-2.0-flash-exp';
    const chat = this.gemini.chats.create({
      model,
      config: {
        temperature: 0.7,
      },
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage({ message: lastMessage.content });

    return {
      content: result.candidates?.[0]?.content?.parts?.[0]?.text || '',
      provider: 'gemini',
      model,
    };
  }

  private async callClaude(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemMessage?.content,
      messages: conversationMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });

    return {
      content:
        response.content[0].type === 'text' ? response.content[0].text : '',
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
    };
  }
}

// Singleton instance
export const aiService = new AIService();
