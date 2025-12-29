import { query, transaction } from '../../db/client.js';
import { aiService } from '../ai/provider.js';
import { auditLog } from '../audit/auditService.js';
import type {
  Conversation,
  Message,
  CreateConversationRequest,
  CloseConversationRequest,
  ConversationWithMessages,
} from '../../types/conversation.js';

export class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(
    accountId: string,
    data: CreateConversationRequest,
    userId: string
  ): Promise<Conversation> {
    const result = await query(
      `INSERT INTO conversations (account_id, lead_id, realtor_id, subject, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [accountId, data.lead_id || null, data.realtor_id || null, data.subject || null]
    );

    const conversation = this.mapRow(result.rows[0]);

    await auditLog({
      account_id: accountId,
      user_id: userId,
      action: 'conversation.created',
      resource_type: 'conversation',
      resource_id: conversation.id,
      metadata: { lead_id: data.lead_id, realtor_id: data.realtor_id },
    });

    return conversation;
  }

  /**
   * Get conversation by ID with messages
   */
  async getConversation(
    conversationId: string,
    accountId: string
  ): Promise<ConversationWithMessages | null> {
    return await transaction(async (client) => {
      // Get conversation
      const convResult = await client.query(
        `SELECT * FROM conversations WHERE id = $1 AND account_id = $2`,
        [conversationId, accountId]
      );

      if (convResult.rows.length === 0) {
        return null;
      }

      const conversation = this.mapRow(convResult.rows[0]);

      // Get messages
      const msgResult = await client.query(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conversationId]
      );

      const messages = msgResult.rows.map(this.mapMessageRow);

      return {
        ...conversation,
        messages,
      };
    });
  }

  /**
   * List all conversations for an account
   */
  async listConversations(
    accountId: string,
    filters?: {
      status?: 'active' | 'closed' | 'archived';
      lead_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ conversations: Conversation[]; total: number }> {
    let whereClause = 'WHERE account_id = $1';
    const params: any[] = [accountId];
    let paramIndex = 2;

    if (filters?.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.lead_id) {
      whereClause += ` AND lead_id = $${paramIndex}`;
      params.push(filters.lead_id);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM conversations ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get conversations
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await query(
      `SELECT * FROM conversations ${whereClause}
       ORDER BY last_message_at DESC NULLS LAST, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const conversations = result.rows.map(this.mapRow);

    return { conversations, total };
  }

  /**
   * Close a conversation and generate AI summary
   */
  async closeConversation(
    conversationId: string,
    accountId: string,
    closeData: CloseConversationRequest
  ): Promise<Conversation> {
    return await transaction(async (client) => {
      // Get conversation with messages
      const convResult = await client.query(
        `SELECT * FROM conversations WHERE id = $1 AND account_id = $2`,
        [conversationId, accountId]
      );

      if (convResult.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const conversation = this.mapRow(convResult.rows[0]);

      if (conversation.status === 'closed') {
        throw new Error('Conversation already closed');
      }

      // Get messages for AI summary
      const msgResult = await client.query(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conversationId]
      );

      const messages = msgResult.rows.map(this.mapMessageRow);

      // Generate AI summary
      let aiSummary = '';
      let aiSummaryGeneratedAt: Date | null = null;

      if (messages.length > 0) {
        try {
          const aiMessages = messages.map((msg) => ({
            role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
            content: msg.body,
          }));

          const summaryResponse = await aiService.generateConversationSummary(aiMessages);
          aiSummary = summaryResponse.content;
          aiSummaryGeneratedAt = new Date();
        } catch (error) {
          console.error('Failed to generate AI summary:', error);
          aiSummary = 'Summary generation failed';
        }
      }

      // Update conversation
      const updateResult = await client.query(
        `UPDATE conversations
         SET status = 'closed',
             closed_at = NOW(),
             closed_by = $1,
             close_reason = $2,
             ai_summary = $3,
             ai_summary_generated_at = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          closeData.user_id,
          closeData.close_reason || null,
          aiSummary,
          aiSummaryGeneratedAt,
          conversationId,
        ]
      );

      const closedConversation = this.mapRow(updateResult.rows[0]);

      // Audit log
      await auditLog({
        account_id: accountId,
        user_id: closeData.user_id,
        action: 'conversation.closed',
        resource_type: 'conversation',
        resource_id: conversationId,
        metadata: {
          close_reason: closeData.close_reason,
          message_count: messages.length,
          ai_summary_generated: !!aiSummary,
        },
      });

      return closedConversation;
    });
  }

  /**
   * Reopen a closed conversation
   */
  async reopenConversation(
    conversationId: string,
    accountId: string,
    userId: string
  ): Promise<Conversation> {
    const result = await query(
      `UPDATE conversations
       SET status = 'active',
           closed_at = NULL,
           closed_by = NULL,
           close_reason = NULL,
           updated_at = NOW()
       WHERE id = $1 AND account_id = $2 AND status = 'closed'
       RETURNING *`,
      [conversationId, accountId]
    );

    if (result.rows.length === 0) {
      throw new Error('Conversation not found or not closed');
    }

    const conversation = this.mapRow(result.rows[0]);

    await auditLog({
      account_id: accountId,
      user_id: userId,
      action: 'conversation.reopened',
      resource_type: 'conversation',
      resource_id: conversationId,
    });

    return conversation;
  }

  /**
   * Get conversation history (closed conversations)
   */
  async getHistory(
    accountId: string,
    filters?: {
      lead_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ conversations: Conversation[]; total: number }> {
    return this.listConversations(accountId, {
      ...filters,
      status: 'closed',
    });
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    accountId: string,
    messageData: Partial<Message>
  ): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (
        conversation_id, account_id, direction, channel,
        from_number, to_number, from_email, to_email,
        subject, body, ai_generated, ai_compliance_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        conversationId,
        accountId,
        messageData.direction as any,
        messageData.channel as any,
        messageData.from_number || null,
        messageData.to_number || null,
        messageData.from_email || null,
        messageData.to_email || null,
        messageData.subject || null,
        messageData.body as any,
        messageData.ai_generated || false,
        messageData.ai_compliance_status || null,
        messageData.status || 'pending',
      ]
    );

    return this.mapMessageRow(result.rows[0]);
  }

  private mapRow(row: any): Conversation {
    return {
      id: row.id,
      account_id: row.account_id,
      lead_id: row.lead_id,
      realtor_id: row.realtor_id,
      subject: row.subject,
      status: row.status,
      ai_summary: row.ai_summary,
      ai_summary_generated_at: row.ai_summary_generated_at,
      message_count: row.message_count || 0,
      last_message_at: row.last_message_at,
      closed_at: row.closed_at,
      closed_by: row.closed_by,
      close_reason: row.close_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapMessageRow(row: any): Message {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      account_id: row.account_id,
      direction: row.direction,
      channel: row.channel,
      from_number: row.from_number,
      to_number: row.to_number,
      from_email: row.from_email,
      to_email: row.to_email,
      subject: row.subject,
      body: row.body,
      ai_generated: row.ai_generated,
      ai_compliance_status: row.ai_compliance_status,
      status: row.status,
      provider_message_id: row.provider_message_id,
      error_message: row.error_message,
      metadata: row.metadata,
      created_at: row.created_at,
      sent_at: row.sent_at,
      delivered_at: row.delivered_at,
    };
  }
}

// Singleton instance
export const conversationService = new ConversationService();
