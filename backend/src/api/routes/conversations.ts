import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { conversationService } from '../../services/conversations/conversationService.js';

const CreateConversationSchema = z.object({
  lead_id: z.string().uuid().optional(),
  realtor_id: z.string().uuid().optional(),
  subject: z.string().optional(),
});

const CloseConversationSchema = z.object({
  close_reason: z.string().optional(),
});

const AddMessageSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  channel: z.enum(['sms', 'email']),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  from_email: z.string().email().optional(),
  to_email: z.string().email().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  ai_generated: z.boolean().optional(),
});

export async function conversationRoutes(server: FastifyInstance) {
  /**
   * POST /accounts/:accountId/conversations
   * Create a new conversation
   */
  server.post<{
    Params: { accountId: string };
    Body: z.infer<typeof CreateConversationSchema>;
  }>('/:accountId/conversations', {
    schema: {
      tags: ['Conversations'],
      summary: 'Create a new conversation',
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', format: 'uuid' },
          realtor_id: { type: 'string', format: 'uuid' },
          subject: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const data = CreateConversationSchema.parse(request.body);
      const userId = (request.user as any)?.id || 'system';

      const conversation = await conversationService.createConversation(
        request.params.accountId,
        data,
        userId
      );

      return reply.code(201).send(conversation);
    },
  });

  /**
   * GET /accounts/:accountId/conversations
   * List all conversations
   */
  server.get<{
    Params: { accountId: string };
    Querystring: {
      status?: 'active' | 'closed' | 'archived';
      lead_id?: string;
      limit?: number;
      offset?: number;
    };
  }>('/:accountId/conversations', {
    schema: {
      tags: ['Conversations'],
      summary: 'List conversations',
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'closed', 'archived'] },
          lead_id: { type: 'string', format: 'uuid' },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          offset: { type: 'number', minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await conversationService.listConversations(
        request.params.accountId,
        request.query
      );

      return reply.send(result);
    },
  });

  /**
   * GET /conversations/:id
   * Get a conversation with messages
   */
  server.get<{
    Params: { id: string };
    Querystring: { accountId: string };
  }>('/conversations/:id', {
    schema: {
      tags: ['Conversations'],
      summary: 'Get conversation details',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const conversation = await conversationService.getConversation(
        request.params.id,
        request.query.accountId
      );

      if (!conversation) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      return reply.send(conversation);
    },
  });

  /**
   * POST /conversations/:id/close
   * Close a conversation (generates AI summary)
   */
  server.post<{
    Params: { id: string };
    Querystring: { accountId: string };
    Body: z.infer<typeof CloseConversationSchema>;
  }>('/conversations/:id/close', {
    schema: {
      tags: ['Conversations'],
      summary: 'Close a conversation',
      description: 'Closes the conversation and generates an AI summary of the interaction',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          close_reason: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = CloseConversationSchema.parse(request.body);
      const userId = (request.user as any)?.id || 'system';

      try {
        const conversation = await conversationService.closeConversation(
          request.params.id,
          request.query.accountId,
          { ...data, user_id: userId }
        );

        return reply.send(conversation);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  });

  /**
   * POST /conversations/:id/reopen
   * Reopen a closed conversation
   */
  server.post<{
    Params: { id: string };
    Querystring: { accountId: string };
  }>('/conversations/:id/reopen', {
    schema: {
      tags: ['Conversations'],
      summary: 'Reopen a closed conversation',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const userId = (request.user as any)?.id || 'system';

      try {
        const conversation = await conversationService.reopenConversation(
          request.params.id,
          request.query.accountId,
          userId
        );

        return reply.send(conversation);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    },
  });

  /**
   * GET /accounts/:accountId/conversations/history
   * Get conversation history (closed conversations)
   */
  server.get<{
    Params: { accountId: string };
    Querystring: {
      lead_id?: string;
      limit?: number;
      offset?: number;
    };
  }>('/:accountId/conversations/history', {
    schema: {
      tags: ['Conversations'],
      summary: 'Get conversation history',
      description: 'Retrieve all closed conversations',
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', format: 'uuid' },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          offset: { type: 'number', minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await conversationService.getHistory(
        request.params.accountId,
        request.query
      );

      return reply.send(result);
    },
  });

  /**
   * POST /conversations/:id/messages
   * Add a message to a conversation
   */
  server.post<{
    Params: { id: string };
    Querystring: { accountId: string };
    Body: z.infer<typeof AddMessageSchema>;
  }>('/conversations/:id/messages', {
    schema: {
      tags: ['Conversations'],
      summary: 'Add a message to a conversation',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['direction', 'channel', 'body'],
        properties: {
          direction: { type: 'string', enum: ['inbound', 'outbound'] },
          channel: { type: 'string', enum: ['sms', 'email'] },
          from_number: { type: 'string' },
          to_number: { type: 'string' },
          from_email: { type: 'string', format: 'email' },
          to_email: { type: 'string', format: 'email' },
          subject: { type: 'string' },
          body: { type: 'string' },
          ai_generated: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = AddMessageSchema.parse(request.body);

      const message = await conversationService.addMessage(
        request.params.id,
        request.query.accountId,
        data
      );

      return reply.code(201).send(message);
    },
  });
}
