/**
 * Performance optimizations for Excalidraw collaboration
 * Includes throttling, debouncing, and efficient update strategies
 */

import { DEBOUNCE_DELAYS, SYNC_FULL_SCENE_INTERVAL_MS } from "./constants";

/**
 * Batch multiple operations together to reduce the number of transactions
 */
export class OperationBatcher {
  private operations: (() => void)[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly delay: number;

  constructor(delay: number = 100) {
    this.delay = delay;
  }

  add(operation: () => void): void {
    this.operations.push(operation);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.operations.length > 0) {
      const operationsToExecute = [...this.operations];
      this.operations = [];

      // Execute all operations in a single batch
      operationsToExecute.forEach(op => op());
    }
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.operations = [];
  }
}

/**
 * Throttle function calls with leading and trailing options
 */
export function createAdvancedThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = { leading: true, trailing: true }
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T>;
  let lastThis: any;

  const throttled = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const now = Date.now();

    // Leading edge
    if (options.leading && now - lastCallTime >= delay) {
      lastCallTime = now;
      return func.apply(this, args);
    }

    // Trailing edge
    if (options.trailing) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (now - lastCallTime >= delay) {
          lastCallTime = Date.now();
          func.apply(lastThis, lastArgs);
        }
      }, delay - (now - lastCallTime));
    }
  } as T & { cancel: () => void; flush: () => void };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  throttled.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastCallTime = Date.now();
      func.apply(lastThis, lastArgs);
    }
  };

  return throttled;
}

/**
 * Debounce function calls with immediate option
 */
export function createAdvancedDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate: boolean = false
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T>;
  let lastThis: any;

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(lastThis, lastArgs);
      }
    }, delay);

    if (callNow) {
      func.apply(this, args);
    }
  } as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      func.apply(lastThis, lastArgs);
    }
  };

  return debounced;
}

/**
 * Rate limiter to prevent excessive operations
 */
export class RateLimiter {
  private readonly maxOperations: number;
  private readonly windowMs: number;
  private operations: number[] = [];

  constructor(maxOperations: number, windowMs: number) {
    this.maxOperations = maxOperations;
    this.windowMs = windowMs;
  }

  canProceed(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old operations outside the window
    this.operations = this.operations.filter(timestamp => timestamp > windowStart);

    if (this.operations.length < this.maxOperations) {
      this.operations.push(now);
      return true;
    }

    return false;
  }

  reset(): void {
    this.operations = [];
  }

  getTimeUntilNextOperation(): number {
    if (this.operations.length < this.maxOperations) {
      return 0;
    }

    const oldestOperation = Math.min(...this.operations);
    return Math.max(0, oldestOperation + this.windowMs - Date.now());
  }
}

/**
 * Performance monitor to track collaboration metrics
 */
export class PerformanceMonitor {
  private metrics: {
    syncOperations: number;
    lastSyncTime: number;
    averageSyncTime: number;
    totalSyncTime: number;
    failedSyncs: number;
    reconnections: number;
    collaboratorCount: number;
    maxCollaborators: number;
  } = {
    syncOperations: 0,
    lastSyncTime: 0,
    averageSyncTime: 0,
    totalSyncTime: 0,
    failedSyncs: 0,
    reconnections: 0,
    collaboratorCount: 0,
    maxCollaborators: 0,
  };

  startSyncOperation(): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.metrics.syncOperations++;
      this.metrics.lastSyncTime = duration;
      this.metrics.totalSyncTime += duration;
      this.metrics.averageSyncTime = this.metrics.totalSyncTime / this.metrics.syncOperations;
    };
  }

  recordFailedSync(): void {
    this.metrics.failedSyncs++;
  }

  recordReconnection(): void {
    this.metrics.reconnections++;
  }

  updateCollaboratorCount(count: number): void {
    this.metrics.collaboratorCount = count;
    this.metrics.maxCollaborators = Math.max(this.metrics.maxCollaborators, count);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      syncOperations: 0,
      lastSyncTime: 0,
      averageSyncTime: 0,
      totalSyncTime: 0,
      failedSyncs: 0,
      reconnections: 0,
      collaboratorCount: 0,
      maxCollaborators: 0,
    };
  }
}

/**
 * Memory-efficient event emitter for collaboration events
 */
export class CollabEventEmitter {
  private events: Map<string, Set<Function>> = new Map();
  private readonly maxListeners: number;

  constructor(maxListeners: number = 50) {
    this.maxListeners = maxListeners;
  }

  on(event: string, listener: Function): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event)!;

    if (listeners.size >= this.maxListeners) {
      console.warn(`Max listeners (${this.maxListeners}) exceeded for event: ${event}`);
      return () => {}; // Return no-op function
    }

    listeners.add(listener);

    // Return cleanup function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    };
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }
}

/**
 * Connection quality monitor
 */
export class ConnectionQualityMonitor {
  private pingTimes: number[] = [];
  private readonly maxSamples = 10;
  private lastPingTime = 0;

  recordPing(duration: number): void {
    this.pingTimes.push(duration);
    this.lastPingTime = Date.now();

    if (this.pingTimes.length > this.maxSamples) {
      this.pingTimes.shift();
    }
  }

  getAveragePing(): number {
    if (this.pingTimes.length === 0) return 0;
    return this.pingTimes.reduce((sum, ping) => sum + ping, 0) / this.pingTimes.length;
  }

  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    const avgPing = this.getAveragePing();
    const timeSinceLastPing = Date.now() - this.lastPingTime;

    if (timeSinceLastPing > 30000) return 'unknown'; // No ping in 30 seconds
    if (avgPing < 50) return 'excellent';
    if (avgPing < 150) return 'good';
    if (avgPing < 300) return 'fair';
    return 'poor';
  }

  reset(): void {
    this.pingTimes = [];
    this.lastPingTime = 0;
  }
}

/**
 * Creates optimized update functions for collaboration
 */
export function createOptimizedUpdateHandlers() {
  const batcher = new OperationBatcher(DEBOUNCE_DELAYS.SYNC);
  const rateLimiter = new RateLimiter(10, 1000); // 10 operations per second

  return {
    batcher,
    rateLimiter,
    createBatchedUpdate: (operation: () => void) => {
      return () => {
        if (rateLimiter.canProceed()) {
          batcher.add(operation);
        }
      };
    },
    cleanup: () => {
      batcher.clear();
      rateLimiter.reset();
    },
  };
}