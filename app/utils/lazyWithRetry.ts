import * as React from "react";

type ComponentPromise<T = any> = Promise<{
  default: React.ComponentType<T>;
}>;

export default function lazyWtihRetry(
  component: () => ComponentPromise,
  retries?: number,
  interval?: number
): React.LazyExoticComponent<React.ComponentType<any>> {
  return React.lazy(() => retry(component, retries, interval));
}

function retry(
  fn: () => ComponentPromise,
  retriesLeft = 3,
  interval = 1000
): ComponentPromise {
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
