import MainIndexer  from '../indexer';
import { Logger } from './Logger';

export class HealthMonitor {
  private lastPingTime: number = Date.now();
  private readonly healthCheckInterval: number;
  private readonly logger: Logger;
  private intervalId?: NodeJS.Timeout;

  constructor(healthCheckInterval: number = 30000, logger: Logger) {
    this.healthCheckInterval = healthCheckInterval;
    this.logger = logger;
  }

  startMonitoring(indexer: MainIndexer): void {
    this.intervalId = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastPing = currentTime - this.lastPingTime;
      
      if (timeSinceLastPing > this.healthCheckInterval * 2) {
        this.logger.log('warning', 'Health check failed - restarting indexer');
        indexer.init(true);
      }
      
      this.checkProviderHealth(indexer);
    }, this.healthCheckInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  updatePing(): void {
    this.lastPingTime = Date.now();
  }

  private async checkProviderHealth(indexer: MainIndexer): Promise<void> {
    for (const network of indexer.networks) {
      try {
        const provider = indexer.getProvider(network);
        
        if (!provider) {
          this.logger.log('warning', `No provider found for network: ${network}`);
          continue;
        }

        const blockNumber = await provider.provider.getBlockNumber();
        this.logger.log('debug', `Provider health check passed for ${network}`, { 
          network,
          blockNumber 
        });
      } catch (error) {
        this.logger.log('error', `Provider health check failed for ${network}`, { 
          network,
          error 
        });
      }
    }
  }
}
