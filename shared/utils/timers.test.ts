import { promiseTimeout, sleep } from "./timers";

describe("timers", () => {
  describe("promiseTimeout", () => {
    it("should timeout after specified milliseconds", async () => {
      // Create a promise that takes longer than timeout
      const slowPromise = sleep(2000);

      // Wrap it with a 100ms timeout
      const timedPromise = promiseTimeout(slowPromise, 100);

      // Expect it to throw a timeout error
      await expect(timedPromise).rejects.toThrow(
        "Operation timed out after 100ms"
      );
    });

    it("should complete successfully if operation finishes in time", async () => {
      // Create a promise that completes quickly
      const fastPromise = Promise.resolve("success");

      // Wrap it with a 1 second timeout
      const timedPromise = promiseTimeout(fastPromise, 1000);

      // Expect it to resolve successfully
      await expect(timedPromise).resolves.toBe("success");
    });

    it("should use custom error message when provided", async () => {
      // Create a promise that takes longer than timeout
      const slowPromise = sleep(2000);

      const customMessage = "Custom timeout message";
      const timedPromise = promiseTimeout(slowPromise, 100, customMessage);

      // Expect it to throw with custom message
      await expect(timedPromise).rejects.toThrow(customMessage);
    });

    it("should preserve the resolved value", async () => {
      const result = { data: "test", value: 42 };
      const promise = Promise.resolve(result);

      const timedPromise = promiseTimeout(promise, 1000);

      await expect(timedPromise).resolves.toEqual(result);
    });

    it("should preserve rejection from original promise", async () => {
      const error = new Error("Original error");
      const promise = Promise.reject(error);

      const timedPromise = promiseTimeout(promise, 1000);

      await expect(timedPromise).rejects.toThrow("Original error");
    });
  });

  describe("sleep", () => {
    it("should resolve after specified time", async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      // Allow some margin for timing
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
