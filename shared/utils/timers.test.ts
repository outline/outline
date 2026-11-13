import { withinTimeLimit } from "./timers";

describe("withinTimeLimit", () => {
  it("should return the result when the function finishes in time", async () => {
    const onTimeout = vi.fn();

    const result = await withinTimeLimit(
      async () => "done",
      100,
      "fallback",
      onTimeout
    );

    expect(result).toEqual("done");
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("should return the fallback when the function is too slow", async () => {
    vi.useFakeTimers();

    try {
      const onTimeout = vi.fn();
      const promise = withinTimeLimit(
        () => new Promise<string>(() => undefined),
        100,
        "fallback",
        onTimeout
      );

      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toEqual("fallback");
      expect(onTimeout).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should throw the error of a function that fails in time", async () => {
    await expect(
      withinTimeLimit(
        async () => {
          throw new Error("failed");
        },
        100,
        "fallback"
      )
    ).rejects.toThrow("failed");
  });
});
