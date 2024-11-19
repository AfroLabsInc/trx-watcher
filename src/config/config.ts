export const CONFIG = {
  database: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/indexer',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  retry: {
    maxAttempts: 5,
    delay: 5000,
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
  webhook: {
    maxRetries: 3,
    retryDelay: 1000,
  },
  healthCheck: {
    interval: 30000,
  },
};
