/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Debounced localStorage wrapper to reduce write operations
 */
class DebouncedStorage {
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 300; // ms

  setItem(key: string, value: string): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, value);
        this.debounceTimers.delete(key);
      } catch (e) {
        console.error(`Failed to save ${key} to localStorage:`, e);
      }
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(key, timer);
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`Failed to read ${key} from localStorage:`, e);
      return null;
    }
  }

  removeItem(key: string): void {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(key);
    }
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove ${key} from localStorage:`, e);
    }
  }

  // Flush all pending writes (useful for cleanup)
  flush(): void {
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();
  }
}

export const debouncedStorage = new DebouncedStorage();

