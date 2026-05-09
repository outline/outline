import * as React from "react";
import lazyWithRetry from "~/utils/lazyWithRetry";

// oxlint-disable no-explicit-any -- ComponentType<any> is the standard React pattern for generic component constraints
export interface LazyComponent<T extends React.ComponentType<any>> {
  Component: React.LazyExoticComponent<T>;
  preload: () => Promise<{ default: T }>;
}

interface LazyLoadOptions {
  retries?: number;
  interval?: number;
  /** If provided, picks this named export from the module instead of `default`. */
  exportName?: string;
}

/**
 * Creates a lazy-loaded component with preloading capability and automatic retries on failure.
 * Supports both default and named exports.
 *
 * @param factory A function that returns a promise of a module.
 * @param options Optional configuration for retry behavior and export name.
 * @returns An object containing the lazy Component and a preload function.
 *
 * @example
 * ```typescript
 * // Default export
 * const MyComponent = createLazyComponent(() => import('./MyComponent'));
 *
 * // Named export
 * const MyComponent = createLazyComponent(() => import('./MyComponent'), {
 *   exportName: 'MyComponent',
 * });
 * ```
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<Record<string, T>>,
  options: LazyLoadOptions = {}
): LazyComponent<T> {
  const { retries, interval, exportName } = options;

  const wrappedFactory = exportName
    ? () =>
        factory().then((m) => ({
          default: m[exportName],
        }))
    : (factory as () => Promise<{ default: T }>);

  return {
    Component: lazyWithRetry(wrappedFactory, retries, interval),
    preload: wrappedFactory,
  };
}
