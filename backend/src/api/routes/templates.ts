import { FastifyInstance } from 'fastify';

export async function templateRoutes(server: FastifyInstance) {
  // TODO: Implement template routes
  server.get('/', async (request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });
}
