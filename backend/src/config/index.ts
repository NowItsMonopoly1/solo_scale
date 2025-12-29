import { config as loadEnv } from 'dotenv';

loadEnv();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3006'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3004',

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/soloscale_dev',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Auth
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return secret || 'dev-only-secret-do-not-use-in-production';
  })(),
  clerkSecretKey: process.env.CLERK_SECRET_KEY,

  // AI Providers
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },

  // Messaging
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
  },

  // Integrations
  salesforce: {
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  },

  floify: {
    webhookSecret: process.env.FLOIFY_WEBHOOK_SECRET,
  },
};
