import { FastifyInstance } from 'fastify';

export async function integrationRoutes(server: FastifyInstance) {
  // TODO: Implement integration webhook routes
  server.post('/floify/webhook', async (request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });

  server.post('/salesforce/webhook', async (request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });
}
