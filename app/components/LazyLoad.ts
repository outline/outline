import * as React from "react";
import lazyWithRetry from "~/utils/lazyWithRetry";

export interface LazyComponent<T extends React.ComponentType<any>> {
  Component: React.LazyExoticComponent<T>;
  preload: () => Promise<{ default: T }>;
}

interface LazyLoadOptions {
  retries?: number;
  interval?: number;
}

/**
 * Creates a lazy-loaded component with preloading capability and automatic retries on failure.
 *
 * @param factory A function that returns a promise of a component (eg: () => import('./MyComponent'))
 * @param options Optional configuration for retry behavior
 * @returns An object containing the lazy Component and a preload function
 *
 * @example
 * ```typescript
 * const MyComponent = createLazyComponent(() => import('./MyComponent'));
 *
 * function App() {
 *   return (
 *     <Suspense fallback={<div>Loading...</div>}>
 *       <MyComponent.Component />
 *     </Suspense>
 *   );
 * }
 *
 * // Preload when needed:
 * MyComponent.preload();
 * ```
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyComponent<T> {
  const { retries, interval } = options;

  return {
    Component: lazyWithRetry(factory, retries, interval),
    preload: factory,
  };
}
