import MainIndexer  from '../indexer';
import { Logger } from './Logger';

export class ConnectionManager {
  private retryAttempts: number = 0;
  private readonly maxRetries: number;
  private readonly reconnectDelay: number;
  private readonly logger: Logger;

  constructor(
    maxRetries: number = 5,
    reconnectDelay: number = 5000,
    logger: Logger
  ) {
    this.maxRetries = maxRetries;
    this.reconnectDelay = reconnectDelay;
    this.logger = logger;
  }

  async handleDisconnect(indexer: MainIndexer): Promise<void> {
    if (this.retryAttempts < this.maxRetries) {
      this.logger.log('info', `Attempting reconnection ${this.retryAttempts + 1}/${this.maxRetries}`);
      
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      
      try {
        await indexer.init(true);
        this.retryAttempts = 0;
        this.logger.log('info', 'Reconnection successful');
      } catch (error) {
        this.retryAttempts++;
        this.logger.log('error', 'Reconnection failed', { error });
        await this.handleDisconnect(indexer);
      }
    } else {
      this.logger.log('error', 'Max reconnection attempts reached');
      process.exit(1);
    }
  }
}
