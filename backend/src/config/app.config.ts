import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'aftersales',
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'admin123',
    url: process.env.DATABASE_URL || 'postgresql://admin:admin123@localhost:5432/aftersales',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    webhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || '',
    apiKey: process.env.AI_SERVICE_API_KEY || '',
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
  },
} as const;
