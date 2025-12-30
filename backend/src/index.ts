import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/index.js';
import { registerRoutes } from './api/routes.js';
import { createRateLimitMiddleware, RateLimitPresets } from './middleware/rateLimit.js';

const server = Fastify({
  logger: {
    level: config.env === 'production' ? 'info' : 'debug',
  },
});

// Register plugins
await server.register(cors, {
  origin: config.env === 'production' ? config.frontendUrl : true,
  credentials: true,
});

await server.register(jwt, {
  secret: config.jwtSecret,
});

// Add authenticate decorator
server.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized - Invalid or missing token' });
  }
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Add global rate limiting (100 requests per 15 minutes per user/IP)
server.addHook('preHandler', createRateLimitMiddleware(RateLimitPresets.standard));

await server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'SoloScale API',
      description: 'Multi-tenant mortgage automation platform',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

await server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
});

// Register routes
try {
  await registerRoutes(server);
} catch (error) {
  console.error('Error registering routes:', error);
}

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Chat endpoint
server.post('/chat', async (request, reply) => {
  return reply.send({ message: 'Chat endpoint working' });
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 SoloScale API running on port ${config.port}`);
    console.log(`📚 API Docs available at http://localhost:${config.port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
