import { FastifyInstance } from 'fastify';
import { NotifyService } from '../../services/notifyService.js';
import { createRateLimitMiddleware, RateLimitPresets } from '../../middleware/rateLimit.js';

/**
 * Messaging Routes
 * Handles SMS and Email sending via Twilio and SendGrid
 */
export async function messagingRoutes(fastify: FastifyInstance) {
  /**
   * Send SMS via Twilio
   */
  fastify.post<{
    Body: {
      to: string;
      message: string;
      from?: string;
    };
  }>(
    '/api/messaging/send-sms',
    {
      preHandler: createRateLimitMiddleware({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50 // 50 SMS per hour per user
      }),
      schema: {
        description: 'Send SMS via Twilio',
        tags: ['messaging'],
        body: {
          type: 'object',
          required: ['to', 'message'],
          properties: {
            to: {
              type: 'string',
              description: 'Recipient phone number (E.164 format, e.g., +14155551234)',
              pattern: '^\\+[1-9]\\d{1,14}$'
            },
            message: {
              type: 'string',
              description: 'SMS message body (max 1600 chars)',
              maxLength: 1600
            },
            from: {
              type: 'string',
              description: 'Override sender phone number (optional)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sid: { type: 'string', description: 'Twilio message SID' },
              status: { type: 'string', description: 'Delivery status' },
              message: { type: 'string', description: 'Success message' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { to, message, from } = request.body;

      try {
        const result = await NotifyService.sendSMS({ to, message, from });

        fastify.log.info({ to, sid: result.sid }, 'SMS sent successfully');

        return reply.send({
          sid: result.sid,
          status: result.status,
          message: 'SMS sent successfully'
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to send SMS');
        return reply.code(500).send({
          error: 'SMS Send Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Send Email via SendGrid
   */
  fastify.post<{
    Body: {
      to: string;
      subject: string;
      body: string;
      from?: string;
      html?: string;
    };
  }>(
    '/api/messaging/send-email',
    {
      preHandler: createRateLimitMiddleware({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 100 // 100 emails per hour per user
      }),
      schema: {
        description: 'Send email via SendGrid',
        tags: ['messaging'],
        body: {
          type: 'object',
          required: ['to', 'subject', 'body'],
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address',
              format: 'email'
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
              maxLength: 500
            },
            body: {
              type: 'string',
              description: 'Email body (plain text)'
            },
            html: {
              type: 'string',
              description: 'Email body (HTML, optional)'
            },
            from: {
              type: 'string',
              description: 'Override sender email (optional)',
              format: 'email'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              messageId: { type: 'string', description: 'SendGrid message ID' },
              message: { type: 'string', description: 'Success message' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { to, subject, body, from, html } = request.body;

      try {
        const result = await NotifyService.sendEmail({ to, subject, body, from, html });

        fastify.log.info({ to, messageId: result.messageId }, 'Email sent successfully');

        return reply.send({
          messageId: result.messageId,
          message: 'Email sent successfully'
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to send email');
        return reply.code(500).send({
          error: 'Email Send Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Create automated chaser (schedule follow-up SMS/Email)
   */
  fastify.post<{
    Body: {
      leadId: string;
      chaserType: 'sms' | 'email' | 'both';
      reason: string;
      templateId?: string;
      customTemplate?: string;
      scheduledAt?: string;
    };
  }>(
    '/api/messaging/create-chaser',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Create automated follow-up chaser',
        tags: ['messaging'],
        body: {
          type: 'object',
          required: ['leadId', 'chaserType', 'reason'],
          properties: {
            leadId: {
              type: 'string',
              description: 'Lead ID to chase'
            },
            chaserType: {
              type: 'string',
              enum: ['sms', 'email', 'both'],
              description: 'Type of chaser to send'
            },
            reason: {
              type: 'string',
              description: 'Reason for chaser (e.g., "Missing Year-to-Date income")',
              maxLength: 500
            },
            templateId: {
              type: 'string',
              description: 'Message template ID (optional)'
            },
            customTemplate: {
              type: 'string',
              description: 'Custom message template (optional)'
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              description: 'When to send chaser (ISO 8601 format, optional, defaults to now)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              chaserId: { type: 'string', description: 'Created chaser ID' },
              message: { type: 'string', description: 'Success message' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { leadId, chaserType, reason, templateId, customTemplate, scheduledAt } = request.body;
      const accountId = (request.user as any).account_id;
      const userId = (request.user as any).id;

      try {
        const chaserId = await NotifyService.createChaser({
          leadId,
          accountId,
          chaserType,
          reason,
          templateId,
          customTemplate,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          createdByUserId: userId
        });

        fastify.log.info({ chaserId, leadId }, 'Chaser created successfully');

        return reply.send({
          chaserId,
          message: 'Chaser created successfully'
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to create chaser');
        return reply.code(500).send({
          error: 'Chaser Creation Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Get message templates
   */
  fastify.get(
    '/api/messaging/templates',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.standard),
      schema: {
        description: 'Get all message templates for account',
        tags: ['messaging'],
        response: {
          200: {
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    body: { type: 'string' },
                    variables: { type: 'array', items: { type: 'string' } },
                    usage_count: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const accountId = (request.user as any).account_id;

      try {
        const { query } = await import('../../db/client.js');
        const result = await query(
          `SELECT id, name, description, category, body, variables, usage_count, last_used_at
           FROM message_templates
           WHERE account_id = $1 OR account_id = 'default'
           ORDER BY usage_count DESC, name ASC`,
          [accountId]
        );

        return reply.send({
          templates: result.rows
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to fetch templates');
        return (reply as any).code(500).send({
          error: 'Template Fetch Failed',
          message: error.message
        });
      }
    }
  );

  /**
   * Process pending chasers (manual trigger for testing)
   */
  fastify.post(
    '/api/messaging/process-chasers',
    {
      preHandler: createRateLimitMiddleware({
        windowMs: 60 * 1000,
        maxRequests: 1 // Only 1 manual trigger per minute
      }),
      schema: {
        description: 'Manually trigger pending chaser processing (admin only)',
        tags: ['messaging'],
        response: {
          200: {
            type: 'object',
            properties: {
              sent: { type: 'number', description: 'Number of chasers sent' },
              failed: { type: 'number', description: 'Number of chasers failed' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const result = await NotifyService.sendPendingChasers();

        fastify.log.info(result, 'Processed pending chasers');

        return reply.send({
          ...result,
          message: `Processed ${result.sent + result.failed} chasers`
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to process chasers');
        return (reply as any).code(500).send({
          error: 'Chaser Processing Failed',
          message: error.message
        });
      }
    }
  );
}
