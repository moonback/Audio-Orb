/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  [key: string]: unknown;
}

class StructuredLogger {
  private formatPayload(level: LogLevel, message: string, context?: LogContext) {
    return {
      ts: new Date().toISOString(),
      level,
      message,
      ...context,
    };
  }

  log(level: LogLevel, message: string, context?: LogContext) {
    const payload = this.formatPayload(level, message, context);
    const printer =
      level === 'error' ? console.error :
      level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
      console.log;
    printer('[NeuroChat]', payload);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
}

export const logger = new StructuredLogger();


