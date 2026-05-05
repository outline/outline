import { STATUS_CODES } from "node:http";
import type * as NodeFetch from "node-fetch";
import { vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
export const originalFetch = globalThis.fetch;

let mockAllRequests = false;
let mockOnceRequests = 0;

const markMockOnce = () => {
  mockOnceRequests += 1;
};

const shouldUseMock = () => {
  if (mockAllRequests) {
    return true;
  }

  if (mockOnceRequests > 0) {
    mockOnceRequests -= 1;
    return true;
  }

  return false;
};

const withStatusText = (args: unknown[]) => {
  const [, params] = args;

  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return args;
  }

  const mockParams = params as Record<string, unknown>;
  if (typeof mockParams.status !== "number" || mockParams.statusText) {
    return args;
  }

  return [
    args[0],
    {
      ...mockParams,
      statusText: STATUS_CODES[mockParams.status] ?? "",
    },
    ...args.slice(2),
  ];
};

fetchMock.enableMocks();
// Default to using the real fetch; tests that need to mock should call
// fetchMock.doMock() or fetchMock.mockResponse(...) explicitly.
fetchMock.dontMock();

// Match jest-fetch-mock semantics: once-variants always mock the next call,
// regardless of dontMock state. (vitest-fetch-mock gates all Once variants
// behind isMocking, so we re-arm it here.)
const onceMethods = [
  "mockResponseOnce",
  "mockRejectOnce",
  "mockAbortOnce",
  "once",
] as const;
for (const name of onceMethods) {
  const original = fetchMock[name] as (...args: unknown[]) => unknown;
  fetchMock[name] = ((...args: unknown[]) => {
    markMockOnce();
    fetchMock.doMockOnce();
    return original(...withStatusText(args));
  }) as (typeof fetchMock)[typeof name];
}

const originalDoMock = fetchMock.doMock.bind(fetchMock);
fetchMock.doMock = ((...args: Parameters<typeof fetchMock.doMock>) => {
  mockAllRequests = true;
  return originalDoMock(...args);
}) as typeof fetchMock.doMock;

const originalDontMock = fetchMock.dontMock.bind(fetchMock);
fetchMock.dontMock = ((...args: Parameters<typeof fetchMock.dontMock>) => {
  mockAllRequests = false;
  mockOnceRequests = 0;
  return originalDontMock(...args);
}) as typeof fetchMock.dontMock;

const originalResetMocks = fetchMock.resetMocks.bind(fetchMock);
fetchMock.resetMocks = ((...args: Parameters<typeof fetchMock.resetMocks>) => {
  mockAllRequests = false;
  mockOnceRequests = 0;
  return originalResetMocks(...args);
}) as typeof fetchMock.resetMocks;

export const getNodeFetchMock = async () => {
  const actual = await vi.importActual<typeof NodeFetch>("node-fetch");
  const actualFetch = actual.default;

  return {
    ...actual,
    default: (
      ...args: Parameters<typeof globalThis.fetch>
    ): ReturnType<typeof globalThis.fetch> => {
      // If a test has explicitly opted into mocking, route through the mock so
      // that mockResponse() etc. behave as expected. Otherwise call the real
      // fetch directly to avoid vitest-fetch-mock's dontMock pass-through bug.
      if (shouldUseMock()) {
        return globalThis.fetch(...args);
      }
      return actualFetch(...args);
    },
  };
};

export default fetchMock;
