import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

const resolveEnvPath = (): string | undefined => {
  const explicit = process.env.DOTENV_CONFIG_PATH;
  if (explicit) {
    return explicit;
  }
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, 'backend/.env'),
    path.resolve(cwd, '..', '.env'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

dotenv.config({ path: resolveEnvPath() });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  },

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

  auth: {
    allowSignup: process.env.AUTH_ALLOW_SIGNUP === 'true',
    defaultRole: process.env.AUTH_DEFAULT_ROLE || 'agent',
  },

  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    webhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
  },

  ai: {
    provider: process.env.AI_SERVICE_PROVIDER || 'deepseek',
    serviceUrl: process.env.AI_SERVICE_URL || '',
    apiKey: process.env.AI_SERVICE_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-v3.1',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.AI_SERVICE_MAX_RETRIES || '3', 10),
    enabled: !!process.env.AI_SERVICE_URL && !!process.env.AI_SERVICE_API_KEY,
  },

  agentscope: {
    serviceUrl: process.env.AGENTSCOPE_URL || 'http://localhost:5000',
    timeout: parseInt(process.env.AGENTSCOPE_TIMEOUT || '30000', 10),
    circuitBreaker: {
      enabled: process.env.AGENTSCOPE_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.AGENTSCOPE_FAILURE_THRESHOLD || '5', 10),
      resetTimeout: parseInt(process.env.AGENTSCOPE_RESET_TIMEOUT || '60000', 10),
    },
  },

  outbox: {
    enabled: process.env.OUTBOX_PROCESSOR_ENABLED !== 'false',
    intervalMs: parseInt(process.env.OUTBOX_PROCESSOR_INTERVAL || '5000', 10),
    concurrency: parseInt(process.env.OUTBOX_PROCESSOR_CONCURRENCY || '10', 10),
  },

  quality: {
    lowScoreThreshold: parseInt(process.env.QUALITY_LOW_SCORE_THRESHOLD || '70', 10),
  },

  requirement: {
    confidenceThreshold: parseFloat(process.env.REQUIREMENT_CONFIDENCE_THRESHOLD || '0.7'),
  },

  workflow: {
    enabled: process.env.WORKFLOW_ENGINE_ENABLED
      ? process.env.WORKFLOW_ENGINE_ENABLED === 'true'
      : false,
    mode: (process.env.WORKFLOW_ENGINE_MODE || 'full') as 'analysis_only' | 'full',
    workflowsDir: process.env.WORKFLOWS_DIR || path.resolve(process.cwd(), 'workflows'),
    defaultTimeout: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT || '10000', 10),
    maxParallelSteps: parseInt(process.env.WORKFLOW_MAX_PARALLEL_STEPS || '6', 10),
    enableLogging: process.env.WORKFLOW_LOGGING_ENABLED !== 'false',
    enableMetrics: process.env.WORKFLOW_METRICS_ENABLED === 'true',
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
  },
} as const;
