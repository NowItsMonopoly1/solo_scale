import { FastifyInstance } from 'fastify';
import { authRoutes } from './routes/auth.js';
import { leadRoutes } from './routes/leads.js';
import { messageRoutes } from './routes/messages.js';
import { conversationRoutes } from './routes/conversations.js';
import { workflowRoutes } from './routes/workflows.js';
import { templateRoutes } from './routes/templates.js';
import { integrationRoutes } from './routes/integrations.js';
import { messagingRoutes } from './routes/messaging.js';
import { documentProcessingRoutes } from './routes/documentProcessing.js';
import { aiRoutes } from './routes/ai.js';
import { partnerRoutes } from './routes/partners.js';
import { systemHealthRoutes } from './routes/systemHealth.js';

export async function registerRoutes(server: FastifyInstance) {
  // Auth routes (no prefix - /auth/login, /auth/me)
  await server.register(authRoutes, { prefix: '/auth' });

  // AI routes (temporarily public for testing)
  await server.register(aiRoutes);

  // Protected routes (require authentication)
  await server.register(async (protectedServer) => {
    // Add auth decorator
    protectedServer.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized - Invalid or missing token' });
      }
    });

    // Account-scoped routes
    await protectedServer.register(conversationRoutes, { prefix: '/accounts' });
    await protectedServer.register(leadRoutes, { prefix: '/accounts/:accountId/leads' });
    await protectedServer.register(workflowRoutes, { prefix: '/accounts/:accountId/workflows' });
    await protectedServer.register(templateRoutes, { prefix: '/accounts/:accountId/templates' });

    // Messaging routes (automated chasers)
    // POST /accounts/:id/messaging/send-chaser
    // GET /accounts/:id/messaging/history/:leadId
    // POST /accounts/:id/messaging/batch-chasers
    await protectedServer.register(messagingRoutes);

    // Partner routes (team management, RBAC)
    // GET /api/partners/team/overview
    // GET /api/partners/team/brokers
    // GET /api/partners/performance
    // GET /api/partners/reassignment/pending
    // POST /api/partners/reassignment/process
    // POST /api/partners/reassignment/:leadId
    // GET /api/partners/activity/:leadId
    await protectedServer.register(partnerRoutes, { prefix: '/api/partners' });

    // System health routes (automated reports)
    // POST /api/system/health-report
    await protectedServer.register(systemHealthRoutes);

    // Document processing routes (background queue)
    // POST /documents/process
    // GET /documents/status/:jobId
    // GET /documents/history/:leadId
    // POST /documents/batch-process
    // await protectedServer.register(documentProcessingRoutes, { prefix: '/documents' }); // Commented out for testing without Redis

    // AI routes moved to public routes above
    // await protectedServer.register(aiRoutes);

    // Conversation routes (also at root level)
    await protectedServer.register(messageRoutes, { prefix: '/conversations' });
  });

  // Webhook routes (public, but verified)
  await server.register(integrationRoutes, { prefix: '/integrations' });
}
