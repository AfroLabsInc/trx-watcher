import { Logger } from './Logger';

export class RateLimiter {
  private requestCount: Map<string, number> = new Map();
  private readonly timeWindow: number;
  private readonly maxRequests: number;
  private readonly logger: Logger;

  constructor(
    timeWindow: number = 60000,
    maxRequests: number = 100,
    logger: Logger
  ) {
    this.timeWindow = timeWindow;
    this.maxRequests = maxRequests;
    this.logger = logger;
  }

  async checkLimit(network: string): Promise<boolean> {
    const current = this.requestCount.get(network) || 0;
    
    if (current >= this.maxRequests) {
      this.logger.log('warning', `Rate limit exceeded for network: ${network}`);
      return false;
    }
    
    this.requestCount.set(network, current + 1);
    setTimeout(() => {
      const currentCount = this.requestCount.get(network) || 0;
      this.requestCount.set(network, Math.max(0, currentCount - 1));
    }, this.timeWindow);
    
    return true;
  }

  getRemainingRequests(network: string): number {
    const current = this.requestCount.get(network) || 0;
    return Math.max(0, this.maxRequests - current);
  }
}
