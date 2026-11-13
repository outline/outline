import { CoalescedFetch, KeyedCoalescedFetch } from "./CoalescedFetch";

function deferred() {
  let resolve = () => {};
  let reject = (_err: Error) => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("CoalescedFetch", () => {
  it("should share an in-flight request with unforced calls", async () => {
    const queue = new CoalescedFetch();
    const request = deferred();
    const fetch = vi.fn(() => request.promise);

    const first = queue.run(fetch);
    const second = queue.run(fetch);
    request.resolve();
    await Promise.all([first, second]);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("should run one more request after an in-flight request when forced", async () => {
    const queue = new CoalescedFetch();
    const requests = [deferred(), deferred()];
    let calls = 0;
    const fetch = vi.fn(() => requests[calls++].promise);

    const first = queue.run(fetch);
    const forced = queue.run(fetch, true);
    const forcedAgain = queue.run(fetch, true);
    expect(fetch).toHaveBeenCalledTimes(1);

    requests[0].resolve();
    await first;
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    let settled = false;
    void forced.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    requests[1].resolve();
    await Promise.all([forced, forcedAgain]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should run the forced request when the in-flight request fails", async () => {
    const queue = new CoalescedFetch();
    const failed = deferred();
    const fetch = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(failed.promise)
      .mockResolvedValueOnce(undefined);

    const first = queue.run(fetch);
    const forced = queue.run(fetch, true);
    failed.reject(new Error("Network error"));

    await expect(first).rejects.toThrow("Network error");
    await expect(forced).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should start a new request after the previous one completes", async () => {
    const queue = new CoalescedFetch();
    const fetch = vi.fn(() => Promise.resolve());

    await queue.run(fetch);
    await queue.run(fetch);

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("KeyedCoalescedFetch", () => {
  it("should share requests for the same key only", async () => {
    const fetches = new KeyedCoalescedFetch<string>();
    const fetch = vi.fn((value: string) => Promise.resolve(value));

    const results = await Promise.all([
      fetches.run("a", () => fetch("a1")),
      fetches.run("a", () => fetch("a2")),
      fetches.run("b", () => fetch("b1")),
    ]);

    expect(results).toEqual(["a1", "a1", "b1"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should return the result of the follow-up request to a forced call", async () => {
    const fetches = new KeyedCoalescedFetch<number>();
    let calls = 0;
    const fetch = () => Promise.resolve(++calls);

    const results = await Promise.all([
      fetches.run("a", fetch),
      fetches.run("a", fetch, true),
    ]);

    expect(results).toEqual([1, 2]);
    expect(await fetches.run("a", fetch)).toBe(3);
  });
});
