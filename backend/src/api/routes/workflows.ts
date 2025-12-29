import { FastifyInstance } from 'fastify';

export async function workflowRoutes(server: FastifyInstance) {
  // TODO: Implement workflow routes
  server.get('/', async (request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });
}
