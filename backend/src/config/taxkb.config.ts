export const taxkbConfig = {
  enabled: process.env.TAXKB_ENABLED === 'true',
  baseUrl: process.env.TAXKB_BASE_URL || 'http://localhost:8000/api/v3',
  apiKey: process.env.TAXKB_API_KEY || 'test_api_key',
  timeout: parseInt(process.env.TAXKB_TIMEOUT || '30000', 10),
  cache: {
    enabled: process.env.TAXKB_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.TAXKB_CACHE_TTL || '300', 10),
    maxSize: parseInt(process.env.TAXKB_CACHE_MAX_SIZE || '100', 10),
  },
  retry: {
    maxAttempts: parseInt(process.env.TAXKB_RETRY_MAX_ATTEMPTS || '3', 10),
    backoff: parseInt(process.env.TAXKB_RETRY_BACKOFF || '1000', 10),
  },
} as const;
