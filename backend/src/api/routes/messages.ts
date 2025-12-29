import { FastifyInstance } from 'fastify';

export async function messageRoutes(server: FastifyInstance) {
  // TODO: Implement message routes
  server.get('/:id/messages', async (request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });
}
