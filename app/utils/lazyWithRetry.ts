import * as React from "react";

type ComponentPromise<T extends React.ComponentType<any>> = Promise<{
  default: T;
}>;

/**
 * Lazy load a component with automatic retry on failure.
 *
 * @param component A function that returns a promise of a component.
 * @param retries The number of retries, defaults to 3.
 * @param interval The interval between retries in milliseconds, defaults to 1000.
 * @returns A lazy component.
 */
export default function lazyWithRetry<T extends React.ComponentType<any>>(
  component: () => ComponentPromise<T>,
  retries?: number,
  interval?: number
): React.LazyExoticComponent<T> {
  return React.lazy(() => retry(component, retries, interval));
}

function retry<T extends React.ComponentType<any>>(
  fn: () => ComponentPromise<T>,
  retriesLeft = 3,
  interval = 1000
): ComponentPromise<T> {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        setTimeout(() => {
          if (retriesLeft === 1) {
            reject(error);
            return;
          }
          retry(fn, retriesLeft - 1, interval).then(resolve, reject);
        }, interval);
      });
  });
}
