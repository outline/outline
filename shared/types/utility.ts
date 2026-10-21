/**
 * An abstract class type narrowed to its concrete subclasses, keeping static
 * members while allowing construction.
 */
export type Concrete<T extends abstract new (...args: never) => unknown> =
  (new (...args: ConstructorParameters<T>) => InstanceType<T>) &
    Pick<T, keyof T>;
