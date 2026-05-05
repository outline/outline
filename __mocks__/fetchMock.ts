import { STATUS_CODES } from "node:http";
import type * as NodeFetch from "node-fetch";
import { vi } from "vitest";
import createFetchMock, {
  type ErrorOrFunction,
  type MockParams,
  type ResponseProvider,
} from "vitest-fetch-mock";

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

const withStatusText = (params?: MockParams): MockParams | undefined => {
  if (!params || params.status === undefined || params.statusText) {
    return params;
  }

  return {
    ...params,
    statusText: STATUS_CODES[params.status] ?? "",
  };
};

fetchMock.enableMocks();
// Default to using the real fetch; tests that need to mock should call
// fetchMock.doMock() or fetchMock.mockResponse(...) explicitly.
fetchMock.dontMock();

// Match jest-fetch-mock semantics: once-variants always mock the next call,
// regardless of dontMock state. (vitest-fetch-mock gates all Once variants
// behind isMocking, so we re-arm it here.)
const originalMockResponseOnce = fetchMock.mockResponseOnce.bind(fetchMock);
fetchMock.mockResponseOnce = ((
  responseProvider: ResponseProvider,
  params?: MockParams
) => {
  markMockOnce();
  fetchMock.doMockOnce();
  return originalMockResponseOnce(responseProvider, withStatusText(params));
}) as typeof fetchMock.mockResponseOnce;

const originalMockRejectOnce = fetchMock.mockRejectOnce.bind(fetchMock);
fetchMock.mockRejectOnce = ((error?: ErrorOrFunction) => {
  markMockOnce();
  fetchMock.doMockOnce();
  return originalMockRejectOnce(error);
}) as typeof fetchMock.mockRejectOnce;

const originalMockAbortOnce = fetchMock.mockAbortOnce.bind(fetchMock);
fetchMock.mockAbortOnce = (() => {
  markMockOnce();
  fetchMock.doMockOnce();
  return originalMockAbortOnce();
}) as typeof fetchMock.mockAbortOnce;

const originalOnce = fetchMock.once.bind(fetchMock);
fetchMock.once = ((responseProvider: ResponseProvider, params?: MockParams) => {
  markMockOnce();
  fetchMock.doMockOnce();
  return originalOnce(responseProvider, withStatusText(params));
}) as typeof fetchMock.once;

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
  const mockFetch = globalThis.fetch as unknown as typeof actualFetch;

  return {
    ...actual,
    default: (
      ...args: Parameters<typeof actualFetch>
    ): ReturnType<typeof actualFetch> => {
      // If a test has explicitly opted into mocking, route through the mock so
      // that mockResponse() etc. behave as expected. Otherwise call the real
      // fetch directly to avoid vitest-fetch-mock's dontMock pass-through bug.
      if (shouldUseMock()) {
        return mockFetch(...args);
      }
      return actualFetch(...args);
    },
  };
};

export default fetchMock;
