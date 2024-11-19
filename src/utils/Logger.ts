export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug'
}

export class Logger {
  private static instance: Logger;
  private logs: any[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: LogLevel | string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta
    };

    this.logs.push(logEntry);
    console.log(JSON.stringify(logEntry));
  }

  getLogs(): any[] {
    return this.logs;
  }
}
