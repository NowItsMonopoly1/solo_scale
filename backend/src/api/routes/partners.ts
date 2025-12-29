import { FastifyInstance } from 'fastify';
import { query } from '../../db/client.js';
import { createRateLimitMiddleware, RateLimitPresets } from '../../middleware/rateLimit.js';

/**
 * Partner Routes
 * Senior partner team management and performance tracking
 */
export async function partnerRoutes(fastify: FastifyInstance) {
  /**
   * Get team overview for senior partner
   */
  fastify.get(
    '/team/overview',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get team overview for senior partner',
        tags: ['partners']
      }
    },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const userRole = (request.user as any).role;

      if (userRole !== 'senior_partner') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only senior partners can access team overview'
        });
      }

      try {
        const result = await query(
          `SELECT * FROM senior_partner_team_overview WHERE senior_partner_id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          return reply.send({
            senior_partner_id: userId,
            total_junior_brokers: 0,
            total_team_leads: 0,
            new_leads: 0,
            in_progress_leads: 0,
            leads_assigned_to_senior: 0,
            reassigned_leads: 0
          });
        }

        return reply.send(result.rows[0]);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch team overview');
        return reply.code(500).send({
          error: 'Fetch Team Overview Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Get junior brokers in team
   */
  fastify.get(
    '/team/brokers',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get all junior brokers reporting to senior partner',
        tags: ['partners']
      }
    },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const userRole = (request.user as any).role;

      if (userRole !== 'senior_partner') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only senior partners can view their team'
        });
      }

      try {
        const result = await query(
          `SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.created_at,
            COUNT(DISTINCT l.id) as total_leads,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'in_progress') as active_leads,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'closed') as closed_leads,
            MAX(lag.occurred_at) as last_activity_at
          FROM users u
          LEFT JOIN leads l ON l.assigned_to_user_id = u.id
          LEFT JOIN lead_activity_log lag ON lag.performed_by_user_id = u.id
          WHERE u.senior_partner_id = $1
          GROUP BY u.id, u.name, u.email, u.role, u.created_at
          ORDER BY u.name ASC`,
          [userId]
        );

        return reply.send({
          brokers: result.rows
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch team brokers');
        return reply.code(500).send({
          error: 'Fetch Team Brokers Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Get partner performance metrics
   */
  fastify.get<{
    Querystring: {
      user_id?: string;
      period_start?: string;
      period_end?: string;
    };
  }>(
    '/performance',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get partner performance metrics',
        tags: ['partners'],
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID to get performance for' },
            period_start: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            period_end: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
          }
        }
      }
    },
    async (request, reply) => {
      const currentUserId = (request.user as any).id;
      const currentUserRole = (request.user as any).role;
      const { user_id, period_start, period_end } = request.query;

      // Authorization: senior partners can view their team, users can view themselves
      const targetUserId = user_id || currentUserId;
      if (currentUserRole !== 'senior_partner' && targetUserId !== currentUserId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You can only view your own performance metrics'
        });
      }

      try {
        let queryText = `
          SELECT * FROM partner_performance
          WHERE user_id = $1
        `;
        const params: any[] = [targetUserId];

        if (period_start) {
          params.push(period_start);
          queryText += ` AND period_start >= $${params.length}`;
        }

        if (period_end) {
          params.push(period_end);
          queryText += ` AND period_end <= $${params.length}`;
        }

        queryText += ` ORDER BY period_start DESC`;

        const result = await query(queryText, params);

        return reply.send({
          performance: result.rows
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch performance metrics');
        return reply.code(500).send({
          error: 'Fetch Performance Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Get leads needing reassignment (for cron job or manual trigger)
   */
  fastify.get(
    '/reassignment/pending',
    {
      preHandler: createRateLimitMiddleware({
        windowMs: 60 * 1000,
        maxRequests: 10
      }),
      schema: {
        description: 'Get leads that need reassignment due to inactivity',
        tags: ['partners']
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;

      try {
        const result = await query(
          `SELECT * FROM leads_needing_reassignment WHERE account_id = $1 ORDER BY minutes_since_assignment DESC`,
          [accountId]
        );

        return reply.send({
          leads: result.rows,
          count: result.rows.length
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch pending reassignments');
        return reply.code(500).send({
          error: 'Fetch Pending Reassignments Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Process automatic reassignments (cron job endpoint)
   */
  fastify.post(
    '/reassignment/process',
    {
      preHandler: createRateLimitMiddleware({
        windowMs: 60 * 1000,
        maxRequests: 1 // Only 1 call per minute
      }),
      schema: {
        description: 'Process all pending lead reassignments (admin/cron only)',
        tags: ['partners']
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;

      try {
        // Get all leads needing reassignment
        const leadsResult = await query(
          `SELECT id, assigned_user_name FROM leads_needing_reassignment WHERE account_id = $1`,
          [accountId]
        );

        let reassigned = 0;
        let failed = 0;

        // Process each lead
        for (const lead of leadsResult.rows) {
          try {
            await query(`SELECT reassign_lead_to_senior($1)`, [lead.id]);
            reassigned++;

            fastify.log.info(
              { leadId: lead.id, assignedUser: lead.assigned_user_name },
              'Lead automatically reassigned to senior partner'
            );
          } catch (error: any) {
            fastify.log.error({ leadId: lead.id, error }, 'Failed to reassign lead');
            failed++;
          }
        }

        return reply.send({
          message: `Processed ${reassigned + failed} lead reassignments`,
          reassigned,
          failed
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to process reassignments');
        return reply.code(500).send({
          error: 'Process Reassignments Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Manual reassignment of a specific lead
   */
  fastify.post<{
    Params: { leadId: string };
    Body: { target_user_id: string; reason?: string };
  }>(
    '/reassignment/:leadId',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Manually reassign a lead to another user',
        tags: ['partners'],
        params: {
          type: 'object',
          required: ['leadId'],
          properties: {
            leadId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['target_user_id'],
          properties: {
            target_user_id: { type: 'string', description: 'User ID to reassign lead to' },
            reason: { type: 'string', description: 'Reason for reassignment' }
          }
        }
      }
    },
    async (request, reply) => {
      const currentUserId = (request.user as any).id;
      const currentUserRole = (request.user as any).role;
      const accountId = (request.user as any).account_id;
      const { leadId } = request.params;
      const { target_user_id, reason } = request.body;

      // Only senior partners can manually reassign
      if (currentUserRole !== 'senior_partner') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only senior partners can manually reassign leads'
        });
      }

      try {
        // Get current lead assignment
        const leadResult = await query(
          `SELECT assigned_to_user_id, account_id FROM leads WHERE id = $1`,
          [leadId]
        );

        if (leadResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Lead not found'
          });
        }

        const currentAssignee = leadResult.rows[0].assigned_to_user_id;

        // Update lead assignment
        await query(
          `UPDATE leads
           SET assigned_to_user_id = $1,
               previous_assigned_to = $2,
               last_assigned_at = NOW(),
               reassignment_count = reassignment_count + 1,
               updated_at = NOW()
           WHERE id = $3`,
          [target_user_id, currentAssignee, leadId]
        );

        // Log reassignment
        await query(
          `INSERT INTO lead_activity_log (id, lead_id, account_id, activity_type, performed_by_user_id, activity_data, occurred_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            leadId,
            accountId,
            'reassigned',
            currentUserId,
            JSON.stringify({
              from_user_id: currentAssignee,
              to_user_id: target_user_id,
              reason: reason || 'Manual reassignment by senior partner',
              automatic: false
            })
          ]
        );

        fastify.log.info({ leadId, fromUser: currentAssignee, toUser: target_user_id }, 'Lead manually reassigned');

        return reply.send({
          message: 'Lead reassigned successfully',
          lead_id: leadId,
          new_assignee: target_user_id
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to reassign lead');
        return reply.code(500).send({
          error: 'Reassign Lead Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Get lead activity history
   */
  fastify.get<{
    Params: { leadId: string };
  }>(
    '/activity/:leadId',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get activity history for a specific lead',
        tags: ['partners'],
        params: {
          type: 'object',
          required: ['leadId'],
          properties: {
            leadId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { leadId } = request.params;

      try {
        const result = await query(
          `SELECT
            lag.*,
            u.name as performed_by_user_name
          FROM lead_activity_log lag
          LEFT JOIN users u ON lag.performed_by_user_id = u.id
          WHERE lag.lead_id = $1
          ORDER BY lag.occurred_at DESC
          LIMIT 100`,
          [leadId]
        );

        return reply.send({
          activity: result.rows
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch lead activity');
        return reply.code(500).send({
          error: 'Fetch Lead Activity Failed',
          message: error.message
        });
      }
    }
  );
}
