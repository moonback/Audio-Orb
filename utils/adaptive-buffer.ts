/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Adaptive audio buffer manager for latency optimization
 */
export class AdaptiveBufferManager {
  private currentBufferSize: number;
  private targetLatency: number; // ms
  private measuredLatencies: number[] = [];
  private readonly maxSamples = 20;
  private readonly minBufferSize = 256; // Minimum valid for createScriptProcessor
  private readonly maxBufferSize = 16384; // Maximum valid for createScriptProcessor
  private adjustmentCooldown = 0;
  private readonly cooldownPeriod = 5000; // ms

  constructor(initialBufferSize: number = 256, targetLatency: number = 200) {
    // Ensure buffer size is a power of 2
    this.currentBufferSize = this.nearestPowerOf2(initialBufferSize);
    this.targetLatency = targetLatency;
  }

  /**
   * Find the nearest power of 2 to the given number
   */
  private nearestPowerOf2(n: number): number {
    // Clamp to valid range
    n = Math.max(this.minBufferSize, Math.min(this.maxBufferSize, n));
    
    // Find nearest power of 2
    const log2 = Math.log2(n);
    const lower = Math.pow(2, Math.floor(log2));
    const upper = Math.pow(2, Math.ceil(log2));
    
    // Return the closest one within bounds
    if (lower < this.minBufferSize) return this.minBufferSize;
    if (upper > this.maxBufferSize) return this.maxBufferSize;
    
    return (n - lower < upper - n) ? lower : upper;
  }

  /**
   * Record a latency measurement
   */
  recordLatency(latency: number): void {
    this.measuredLatencies.push(latency);
    if (this.measuredLatencies.length > this.maxSamples) {
      this.measuredLatencies.shift();
    }

    // Adjust buffer size periodically
    const now = performance.now();
    if (now > this.adjustmentCooldown && this.measuredLatencies.length >= 10) {
      this.adjustBufferSize();
      this.adjustmentCooldown = now + this.cooldownPeriod;
    }
  }

  /**
   * Get current recommended buffer size
   */
  getBufferSize(): number {
    return this.currentBufferSize;
  }

  /**
   * Adjust buffer size based on measured latencies
   */
  private adjustBufferSize(): void {
    if (this.measuredLatencies.length < 5) return;

    const avgLatency = this.measuredLatencies.reduce((a, b) => a + b, 0) / this.measuredLatencies.length;
    const variance = this.measuredLatencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / this.measuredLatencies.length;
    const stdDev = Math.sqrt(variance);

    // If latency is consistently high, reduce buffer size (if possible)
    if (avgLatency > this.targetLatency * 1.5 && this.currentBufferSize > this.minBufferSize) {
      // Reduce buffer size by half (next power of 2 down)
      const newSize = this.currentBufferSize / 2;
      this.currentBufferSize = this.nearestPowerOf2(newSize);
      console.log(`[AdaptiveBuffer] Reducing buffer size to ${this.currentBufferSize} (avg latency: ${avgLatency.toFixed(1)}ms)`);
    }
    // If latency is low and stable, we can try smaller buffers
    else if (avgLatency < this.targetLatency * 0.7 && stdDev < this.targetLatency * 0.2 && this.currentBufferSize > this.minBufferSize) {
      // Reduce buffer size by half (next power of 2 down)
      const newSize = this.currentBufferSize / 2;
      this.currentBufferSize = this.nearestPowerOf2(newSize);
      console.log(`[AdaptiveBuffer] Optimizing buffer size to ${this.currentBufferSize} (avg latency: ${avgLatency.toFixed(1)}ms)`);
    }
    // If latency is very low but unstable, increase buffer slightly
    else if (avgLatency < this.targetLatency * 0.5 && stdDev > this.targetLatency * 0.3 && this.currentBufferSize < this.maxBufferSize) {
      // Double buffer size (next power of 2 up)
      const newSize = this.currentBufferSize * 2;
      this.currentBufferSize = this.nearestPowerOf2(newSize);
      console.log(`[AdaptiveBuffer] Stabilizing buffer size to ${this.currentBufferSize} (high variance: ${stdDev.toFixed(1)}ms)`);
    }

    // Clear old measurements after adjustment
    this.measuredLatencies = [];
  }

  /**
   * Reset to initial buffer size
   */
  reset(initialSize: number = 256): void {
    this.currentBufferSize = this.nearestPowerOf2(initialSize);
    this.measuredLatencies = [];
    this.adjustmentCooldown = 0;
  }
}

