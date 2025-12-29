import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationService } from './conversationService.js';
import * as dbClient from '../../db/client.js';

// Mock database and AI service
vi.mock('../../db/client');
vi.mock('../ai/provider', () => ({
  aiService: {
    generateConversationSummary: vi.fn().mockResolvedValue({
      content: 'Test summary of the conversation',
      provider: 'gemini',
      model: 'models/gemini-2.0-flash-exp',
    }),
  },
}));
vi.mock('../audit/auditService', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('ConversationService', () => {
  const mockAccountId = 'acc-123';
  const mockUserId = 'user-456';
  const mockConversationId = 'conv-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockConversation = {
        id: mockConversationId,
        account_id: mockAccountId,
        lead_id: 'lead-123',
        subject: 'Test Conversation',
        status: 'active',
        message_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValue({
        rows: [mockConversation],
        rowCount: 1,
      } as any);

      const result = await conversationService.createConversation(
        mockAccountId,
        {
          lead_id: 'lead-123',
          subject: 'Test Conversation',
        },
        mockUserId
      );

      expect(result.id).toBe(mockConversationId);
      expect(result.status).toBe('active');
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversations'),
        expect.arrayContaining([mockAccountId])
      );
    });
  });

  describe('closeConversation', () => {
    it('should close conversation and generate AI summary', async () => {
      const mockConversation = {
        id: mockConversationId,
        account_id: mockAccountId,
        status: 'active',
        message_count: 3,
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: mockConversationId,
          direction: 'inbound',
          body: 'Hello, I need help',
          created_at: new Date(),
        },
        {
          id: 'msg-2',
          conversation_id: mockConversationId,
          direction: 'outbound',
          body: 'How can I assist you?',
          created_at: new Date(),
        },
      ];

      const mockClosedConversation = {
        ...mockConversation,
        status: 'closed',
        ai_summary: 'Test summary of the conversation',
        closed_at: new Date(),
        closed_by: mockUserId,
      };

      // Mock transaction
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [mockConversation] }) // Get conversation
          .mockResolvedValueOnce({ rows: mockMessages }) // Get messages
          .mockResolvedValueOnce({ rows: [mockClosedConversation] }), // Update conversation
      };

      vi.mocked(dbClient.transaction).mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      const result = await conversationService.closeConversation(
        mockConversationId,
        mockAccountId,
        {
          user_id: mockUserId,
          close_reason: 'Resolved',
        }
      );

      expect(result.status).toBe('closed');
      expect(result.ai_summary).toBe('Test summary of the conversation');
      expect(result.closed_by).toBe(mockUserId);
    });

    it('should throw error if conversation already closed', async () => {
      const mockClosedConversation = {
        id: mockConversationId,
        account_id: mockAccountId,
        status: 'closed',
      };

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [mockClosedConversation] }),
      };

      vi.mocked(dbClient.transaction).mockImplementation(async (callback) => {
        return callback(mockClient as any);
      });

      await expect(
        conversationService.closeConversation(mockConversationId, mockAccountId, {
          user_id: mockUserId,
        })
      ).rejects.toThrow('Conversation already closed');
    });
  });

  describe('listConversations', () => {
    it('should list conversations with filters', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          account_id: mockAccountId,
          status: 'active',
          message_count: 5,
        },
        {
          id: 'conv-2',
          account_id: mockAccountId,
          status: 'active',
          message_count: 3,
        },
      ];

      vi.mocked(dbClient.query)
        .mockResolvedValueOnce({ rows: [{ total: '2' }] } as any)
        .mockResolvedValueOnce({ rows: mockConversations } as any);

      const result = await conversationService.listConversations(mockAccountId, {
        status: 'active',
        limit: 10,
      });

      expect(result.total).toBe(2);
      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0].id).toBe('conv-1');
    });
  });

  describe('getHistory', () => {
    it('should retrieve closed conversations', async () => {
      const mockClosedConvs = [
        {
          id: 'conv-1',
          account_id: mockAccountId,
          status: 'closed',
          ai_summary: 'Summary 1',
        },
      ];

      vi.mocked(dbClient.query)
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: mockClosedConvs } as any);

      const result = await conversationService.getHistory(mockAccountId);

      expect(result.total).toBe(1);
      expect(result.conversations[0].status).toBe('closed');
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversation_id: mockConversationId,
        account_id: mockAccountId,
        direction: 'outbound',
        channel: 'sms',
        body: 'Test message',
        created_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValue({
        rows: [mockMessage],
      } as any);

      const result = await conversationService.addMessage(
        mockConversationId,
        mockAccountId,
        {
          direction: 'outbound',
          channel: 'sms',
          body: 'Test message',
        }
      );

      expect(result.id).toBe('msg-123');
      expect(result.body).toBe('Test message');
    });
  });
});
