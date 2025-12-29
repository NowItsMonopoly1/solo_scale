import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db/client.js';
import bcrypt from 'bcrypt';
import { createRateLimitMiddleware, RateLimitPresets } from '../../middleware/rateLimit.js';

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  accountName?: string;
}

// Extend Fastify's user type for proper typing
// declare module 'fastify' {
//   interface FastifyRequest {
//     user: any;
//   }
// }

export async function authRoutes(server: FastifyInstance) {
  /**
   * POST /auth/register
   * Register new user and account
   */
  server.post<{ Body: RegisterBody }>(
    '/register',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.auth),
      schema: {
        description: 'Register new user account',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 2 },
            accountName: { type: 'string' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  accountId: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      const { email, password, name, accountName } = request.body;

      try {
        // Check if user already exists
        const existingUser = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          return reply.code(409).send({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create account first
        const accountResult = await db.query(
          `INSERT INTO accounts (name, status, created_at)
           VALUES ($1, 'active', NOW())
           RETURNING id`,
          [accountName || `${name}'s Account`]
        );

        const accountId = accountResult.rows[0].id;

        // Create user
        const userResult = await db.query(
          `INSERT INTO users (account_id, email, password_hash, name, role, created_at)
           VALUES ($1, $2, $3, $4, 'owner', NOW())
           RETURNING id, email, name, role, account_id`,
          [accountId, email, passwordHash, name]
        );

        const user = userResult.rows[0];

        // Generate JWT token
        const token = server.jwt.sign({
          id: user.id,
          accountId: user.account_id,
          email: user.email,
          role: user.role
        });

        return reply.code(201).send({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountId: user.account_id
          }
        });

      } catch (error) {
        server.log.error(`Registration error: ${(error as Error).message}`);
        return reply.code(500).send({ error: 'Registration failed' });
      }
    }
  );

  /**
   * POST /auth/login
   * Authenticate user and return JWT token
   */
  server.post<{ Body: LoginBody }>(
    '/login',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.auth),
      schema: {
        description: 'Login with email and password',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  accountId: { type: 'string' }
                }
              }
            }
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      try {
        // Find user by email
        const result = await db.query(
          'SELECT id, email, password_hash, name, role, account_id FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length === 0) {
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = server.jwt.sign({
          id: user.id,
          accountId: user.account_id,
          email: user.email,
          role: user.role
        });

        return reply.send({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountId: user.account_id
          }
        });

      } catch (error) {
        server.log.error(`Login error: ${(error as Error).message}`);
        return reply.code(500).send({ error: 'Login failed' });
      }
    }
  );

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  server.get('/me', {
    onRequest: [server.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const result = await db.query(
        'SELECT id, email, name, role, account_id FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = result.rows[0];

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountId: user.account_id
      });

    } catch (error) {
      server.log.error(`Get user error: ${(error as Error).message}`);
      return reply.code(500).send({ error: 'Failed to get user' });
    }
  });
}
