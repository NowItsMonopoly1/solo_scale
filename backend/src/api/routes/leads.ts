import { FastifyInstance } from 'fastify';
import { query } from '../../db/client.js';
import { createRateLimitMiddleware, RateLimitPresets } from '../../middleware/rateLimit.js';

/**
 * Leads Routes
 * CRUD operations for managing mortgage leads
 */
export async function leadRoutes(fastify: FastifyInstance) {
  /**
   * Get all leads for account
   */
  fastify.get<{
    Querystring: {
      status?: string;
      limit?: number;
      offset?: number;
      sort?: 'urgency' | 'retirement_priority' | 'created_at';
      order?: 'asc' | 'desc';
    };
  }>(
    '/',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get all leads for authenticated account',
        tags: ['leads'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['new', 'in_progress', 'qualified', 'closed', 'lost'],
              description: 'Filter by lead status'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Number of leads to return'
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Pagination offset'
            },
            sort: {
              type: 'string',
              enum: ['urgency', 'retirement_priority', 'created_at'],
              default: 'retirement_priority',
              description: 'Sort field'
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: 'Sort order'
            }
          }
        }
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;
      const { status, limit = 50, offset = 0, sort = 'retirement_priority', order = 'desc' } = request.query;

      try {
        let queryText = `
          SELECT
            l.*,
            COUNT(DISTINCT s.id) as total_sessions,
            COUNT(DISTINCT m.id) as total_messages,
            COUNT(c.id) FILTER (WHERE c.status = 'sent') as chasers_sent,
            COUNT(c.id) FILTER (WHERE c.status = 'pending') as chasers_pending
          FROM leads l
          LEFT JOIN sessions s ON l.id = s.lead_id
          LEFT JOIN messages m ON s.id = m.session_id
          LEFT JOIN chasers c ON l.id = c.lead_id
          WHERE l.account_id = $1
        `;

        const params: any[] = [accountId];

        if (status) {
          params.push(status);
          queryText += ` AND l.status = $${params.length}`;
        }

        queryText += ` GROUP BY l.id`;

        // Sort mapping
        const sortField = sort === 'urgency' ? 'urgency_score' :
                         sort === 'retirement_priority' ? 'retirement_priority_score' :
                         'created_at';

        queryText += ` ORDER BY ${sortField} ${order.toUpperCase()}`;
        queryText += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

        params.push(limit, offset);

        const result = await query(queryText, params);

        // Get total count
        const countResult = await query(
          `SELECT COUNT(*) as total FROM leads WHERE account_id = $1${status ? ' AND status = $2' : ''}`,
          status ? [accountId, status] : [accountId]
        );

        return reply.send({
          leads: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit,
            offset,
            hasMore: offset + limit < parseInt(countResult.rows[0].total)
          }
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch leads');
        return reply.code(500).send({
          error: 'Fetch Leads Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Get single lead by ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get lead by ID',
        tags: ['leads'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Lead ID' }
          }
        }
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;
      const { id } = request.params;

      try {
        const result = await query(
          `SELECT
            l.*,
            u.name as assigned_user_name,
            COUNT(DISTINCT s.id) as total_sessions,
            COUNT(DISTINCT m.id) as total_messages,
            COUNT(c.id) FILTER (WHERE c.status = 'sent') as chasers_sent,
            COUNT(c.id) FILTER (WHERE c.status = 'pending') as chasers_pending,
            MAX(c.sent_at) as last_chaser_sent_at
          FROM leads l
          LEFT JOIN users u ON l.assigned_to_user_id = u.id
          LEFT JOIN sessions s ON l.id = s.lead_id
          LEFT JOIN messages m ON s.id = m.session_id
          LEFT JOIN chasers c ON l.id = c.lead_id
          WHERE l.id = $1 AND l.account_id = $2
          GROUP BY l.id, u.name`,
          [id, accountId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Lead not found'
          });
        }

        return reply.send({ lead: result.rows[0] });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch lead');
        return reply.code(500).send({
          error: 'Fetch Lead Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Create new lead
   */
  fastify.post<{
    Body: {
      name: string;
      email: string;
      phone?: string;
      source: string;
      status?: string;
      loan_amount?: number;
      credit_tier?: string;
      ssn_last_4?: string;
      retirement_priority_score?: number;
      assigned_to_user_id?: string;
      tags?: string[];
    };
  }>(
    '/',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Create new lead',
        tags: ['leads'],
        body: {
          type: 'object',
          required: ['name', 'email', 'source'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', maxLength: 20 },
            source: { type: 'string', maxLength: 100 },
            status: {
              type: 'string',
              enum: ['new', 'in_progress', 'qualified', 'closed', 'lost'],
              default: 'new'
            },
            loan_amount: { type: 'number', minimum: 0 },
            credit_tier: {
              type: 'string',
              enum: ['excellent', 'good', 'fair', 'poor', 'unknown']
            },
            ssn_last_4: { type: 'string', pattern: '^[0-9]{4}$' },
            retirement_priority_score: { type: 'number', minimum: 0, maximum: 100 },
            assigned_to_user_id: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;
      const {
        name, email, phone, source, status = 'new',
        loan_amount, credit_tier, ssn_last_4,
        retirement_priority_score = 50,
        assigned_to_user_id, tags = []
      } = request.body;

      try {
        const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const result = await query(
          `INSERT INTO leads (
            id, account_id, name, email, phone, source, status,
            loan_amount, credit_tier, ssn_last_4, retirement_priority_score,
            assigned_to_user_id, tags, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          RETURNING *`,
          [
            leadId, accountId, name, email, phone, source, status,
            loan_amount, credit_tier, ssn_last_4, retirement_priority_score,
            assigned_to_user_id, tags
          ]
        );

        fastify.log.info({ leadId, name, email }, 'Lead created successfully');

        return reply.code(201).send({
          lead: result.rows[0],
          message: 'Lead created successfully'
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to create lead');
        return reply.code(500).send({
          error: 'Create Lead Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Update lead
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      email?: string;
      phone?: string;
      status?: string;
      loan_amount?: number;
      credit_tier?: string;
      retirement_priority_score?: number;
      assigned_to_user_id?: string;
      next_follow_up_date?: string;
      tags?: string[];
    };
  }>(
    '/:id',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Update lead',
        tags: ['leads'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', maxLength: 20 },
            status: {
              type: 'string',
              enum: ['new', 'in_progress', 'qualified', 'closed', 'lost']
            },
            loan_amount: { type: 'number', minimum: 0 },
            credit_tier: {
              type: 'string',
              enum: ['excellent', 'good', 'fair', 'poor', 'unknown']
            },
            retirement_priority_score: { type: 'number', minimum: 0, maximum: 100 },
            assigned_to_user_id: { type: 'string' },
            next_follow_up_date: { type: 'string', format: 'date-time' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;
      const { id } = request.params;
      const updates = request.body;

      try {
        // Build dynamic UPDATE query
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        });

        if (fields.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'No fields to update'
          });
        }

        fields.push(`updated_at = NOW()`);
        values.push(id, accountId);

        const result = await query(
          `UPDATE leads SET ${fields.join(', ')}
           WHERE id = $${paramIndex} AND account_id = $${paramIndex + 1}
           RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Lead not found'
          });
        }

        fastify.log.info({ leadId: id }, 'Lead updated successfully');

        return reply.send({
          lead: result.rows[0],
          message: 'Lead updated successfully'
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to update lead');
        return reply.code(500).send({
          error: 'Update Lead Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Delete lead
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Delete lead',
        tags: ['leads'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;
      const { id } = request.params;

      try {
        const result = await query(
          `DELETE FROM leads WHERE id = $1 AND account_id = $2 RETURNING id`,
          [id, accountId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Lead not found'
          });
        }

        fastify.log.info({ leadId: id }, 'Lead deleted successfully');

        return reply.send({
          message: 'Lead deleted successfully'
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to delete lead');
        return reply.code(500).send({
          error: 'Delete Lead Failed',
          message: error.message
        });
      }
    }
  );
}
