/* oxlint-disable @typescript-eslint/explicit-function-return-type */
import type { Tracer } from "dd-trace";

// oxlint-disable-next-line @typescript-eslint/no-empty-function
const emptyFn = function () {};

const callableHandlers = {
  get<T, P extends keyof T>(_target: T, _prop: P, _receiver: unknown): T[P] {
    const newMock = new Proxy(emptyFn, callableHandlers);
    return newMock as unknown as T[P];
  },

  apply<T extends (...args: never[]) => unknown, A extends Parameters<T>>(
    _target: T,
    _thisArg: unknown,
    _args: A
  ): ReturnType<T> {
    const newMock = new Proxy(emptyFn, callableHandlers);
    return newMock as unknown as ReturnType<T>;
  },
};

const callableMock = new Proxy(emptyFn, callableHandlers);

type MockTracer = Tracer & { isMock?: boolean };

export const mockTracer = new Proxy({} as MockTracer, {
  get<K extends keyof MockTracer>(_target: Tracer, key: K) {
    if (key === "isMock") {
      return true;
    }

    if (key === "wrap") {
      return (_: unknown, f: unknown) => f;
    }

    return callableMock;
  },
});
