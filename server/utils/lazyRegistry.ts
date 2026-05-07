/**
 * Create a lazily-loaded object registry. The loader runs only when the
 * registry is first accessed.
 *
 * @param load A function that returns the registry contents.
 * @returns A proxy that exposes the lazily-loaded registry.
 */
export function createLazyRegistry<T>(
  load: () => Record<string, T>
): Record<string, T> {
  let cache: Record<string, T> | undefined;

  const getRegistry = () => {
    if (cache) {
      return cache;
    }

    cache = load();
    return cache;
  };

  return new Proxy({} as Record<string, T>, {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") {
        return undefined;
      }

      return getRegistry()[prop];
    },
    has(_target, prop: string | symbol) {
      return typeof prop === "string" && prop in getRegistry();
    },
    ownKeys() {
      return Reflect.ownKeys(getRegistry());
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      return Reflect.getOwnPropertyDescriptor(getRegistry(), prop);
    },
  });
}
