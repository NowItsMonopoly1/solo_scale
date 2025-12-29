import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  keyGenerator?: (req: FastifyRequest) => string; // Custom key generator
  handler?: (req: FastifyRequest, reply: FastifyReply) => void; // Custom rate limit handler
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter middleware
 *
 * NOTE: For production with multiple servers, use Redis-based rate limiting
 * with @fastify/rate-limit or similar distributed solution.
 *
 * This implementation is suitable for:
 * - Development/testing
 * - Single-server deployments
 * - Proof of concept
 */
export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: RateLimitConfig) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Get rate limit key for a request
   * Default: user ID if authenticated, otherwise IP address
   */
  private getKey(req: FastifyRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Use user ID if authenticated
    if ((req.user as any)?.id) {
      return `user:${(req.user as any).id}`;
    }

    // Fall back to IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Check if request should be rate limited
   */
  public async checkLimit(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<boolean> {
    const key = this.getKey(req);
    const now = Date.now();

    let record = this.requests.get(key);

    // Initialize or reset if window expired
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.requests.set(key, record);
    }

    // Increment request count
    record.count++;

    // Set rate limit headers
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const resetTime = Math.ceil(record.resetTime / 1000);

    reply.header('X-RateLimit-Limit', this.config.maxRequests);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', resetTime);

    // Check if rate limit exceeded
    if (record.count > this.config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      reply.header('Retry-After', retryAfter);

      if (this.config.handler) {
        this.config.handler(req, reply);
      } else {
        reply.code(429).send({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        });
      }

      return false;
    }

    return true;
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Destroy rate limiter and cleanup resources
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

/**
 * Create rate limit middleware for Fastify
 *
 * @example
 * // Global rate limiting
 * server.addHook('preHandler', createRateLimitMiddleware({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   maxRequests: 100
 * }));
 *
 * @example
 * // Per-route rate limiting
 * server.get('/api/data', {
 *   preHandler: createRateLimitMiddleware({
 *     windowMs: 60 * 1000, // 1 minute
 *     maxRequests: 10
 *   })
 * }, handler);
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const allowed = await limiter.checkLimit(req, reply);
    if (!allowed) {
      // Rate limit exceeded - middleware already sent response
      return;
    }
    // Continue to next handler
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10
  },

  // Standard: 100 requests per 15 minutes
  standard: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  },

  // Generous: 1000 requests per hour
  generous: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000
  },

  // AI endpoints: 30 requests per minute (expensive operations)
  ai: {
    windowMs: 60 * 1000,
    maxRequests: 30
  },

  // Auth endpoints: 5 requests per 15 minutes (prevent brute force)
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5
  },

  // File upload: 20 requests per hour
  fileUpload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20
  }
};
