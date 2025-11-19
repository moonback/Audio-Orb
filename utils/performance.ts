/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Throttled requestAnimationFrame for better performance
 */
export class ThrottledRAF {
  private rafId: number | null = null;
  private lastTime = 0;
  private readonly throttleMs: number;

  constructor(throttleMs: number = 16) {
    this.throttleMs = throttleMs;
  }

  request(callback: (time: number) => void): void {
    if (this.rafId !== null) {
      return; // Already scheduled
    }

    this.rafId = requestAnimationFrame((time) => {
      this.rafId = null;
      
      const elapsed = time - this.lastTime;
      if (elapsed >= this.throttleMs) {
        this.lastTime = time;
        callback(time);
      } else {
        // Schedule next frame
        this.request(callback);
      }
    });
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

/**
 * Simple debounce utility
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

