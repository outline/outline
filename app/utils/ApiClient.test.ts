import { CSRF } from "@shared/constants";
import { client } from "~/utils/ApiClient";

// The app test setup replaces ApiClient with a stub for store tests; restore
// the real implementation as it is the subject under test here.
vi.unmock("~/utils/ApiClient");

const setCsrfCookie = (value: string) => {
  document.cookie = `${CSRF.cookieName}=${value}`;
};

const jsonResponse = () =>
  new Response(JSON.stringify({ data: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("ApiClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends the current CSRF token with mutating requests", async () => {
    const seenTokens: (string | null)[] = [];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        seenTokens.push(new Headers(init?.headers).get(CSRF.headerName));
        return jsonResponse();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    setCsrfCookie("token-a");

    await expect(
      client.post("/documents.update", { id: "send-token" })
    ).resolves.toEqual({ data: "ok" });

    expect(seenTokens).toEqual(["token-a"]);
  });

  it("re-reads the CSRF token from the cookie on retry", async () => {
    const seenTokens: (string | null)[] = [];
    let attempts = 0;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        seenTokens.push(new Headers(init?.headers).get(CSRF.headerName));
        attempts += 1;

        if (attempts === 1) {
          // Simulate the server rotating the token while the request fails at
          // the network level, e.g. a concurrent GET response in another tab.
          setCsrfCookie("token-b");
          throw new TypeError("network error");
        }
        return jsonResponse();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    setCsrfCookie("token-a");

    const promise = client.post("/documents.update", { id: "retry-token" });

    // Allow the first attempt to fail, then advance past the retry delay.
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual({ data: "ok" });
    expect(seenTokens).toEqual(["token-a", "token-b"]);
  });

  it("does not send a CSRF token for read-only endpoints", async () => {
    const seenTokens: (string | null)[] = [];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        seenTokens.push(new Headers(init?.headers).get(CSRF.headerName));
        return jsonResponse();
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    setCsrfCookie("token-a");

    await expect(
      client.post("/documents.info", { id: "read-only" })
    ).resolves.toEqual({ data: "ok" });

    expect(seenTokens).toEqual([null]);
  });
});
