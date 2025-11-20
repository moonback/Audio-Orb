/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './logger';

export type TelemetryEvent =
  | { type: 'latency'; value: number }
  | { type: 'error'; message: string }
  | { type: 'fallback'; active: boolean; reason?: string };

export interface MetricsSnapshot {
  avgLatency: number;
  errorRate: number;
  samples: number;
  uptimeSeconds: number;
  lastError?: string;
  fallbackActive: boolean;
}

class Telemetry extends EventTarget {
  private latencies: number[] = [];
  private errors = 0;
  private interactions = 0;
  private startTime = Date.now();
  private lastError?: string;
  private fallbackActive = false;

  logLatency(value: number) {
    this.latencies.push(value);
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
    this.interactions++;
    this.emitSnapshot();
  }

  logError(message: string) {
    this.errors++;
    this.lastError = message;
    logger.error('gemini_error', { message });
    this.emitSnapshot();
  }

  setFallback(active: boolean, reason?: string) {
    this.fallbackActive = active;
    logger.warn('fallback_state_changed', { active, reason });
    this.emitSnapshot();
  }

  private getAverageLatency() {
    if (!this.latencies.length) return 0;
    const sum = this.latencies.reduce((acc, cur) => acc + cur, 0);
    return Math.round(sum / this.latencies.length);
  }

  private getErrorRate() {
    if (this.interactions === 0) return 0;
    return Number(((this.errors / this.interactions) * 100).toFixed(1));
  }

  private emitSnapshot() {
    const snapshot: MetricsSnapshot = {
      avgLatency: this.getAverageLatency(),
      errorRate: this.getErrorRate(),
      samples: this.latencies.length,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastError: this.lastError,
      fallbackActive: this.fallbackActive,
    };
    this.dispatchEvent(new CustomEvent('metrics', { detail: snapshot }));
  }
}

export const telemetry = new Telemetry();


