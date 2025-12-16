import { promiseTimeout } from "@shared/utils/timers";

// Mock the dependencies
jest.mock("@server/logging/Logger");
jest.mock("@server/logging/tracing", () => ({
  trace: () => () => {},
}));
jest.mock("@server/models/Document");
jest.mock("@server/storage/database");
jest.mock("@server/storage/redis");
jest.mock("../commands/documentCollaborativeUpdater");

describe("PersistenceExtension", () => {
  describe("timeout functionality", () => {
    it("should timeout after 15 seconds", async () => {
      // Create a promise that takes longer than 15 seconds
      const slowPromise = new Promise((resolve) => {
        setTimeout(resolve, 20000);
      });

      // Wrap it with a 15 second timeout
      const timedPromise = promiseTimeout(slowPromise, 15000);

      // Expect it to throw a timeout error
      await expect(timedPromise).rejects.toThrow(
        "Operation timed out after 15000ms"
      );
    }, 20000);

    it("should complete successfully if operation finishes in time", async () => {
      // Create a promise that completes quickly
      const fastPromise = new Promise((resolve) => {
        setTimeout(() => resolve("success"), 100);
      });

      // Wrap it with a 15 second timeout
      const timedPromise = promiseTimeout(fastPromise, 15000);

      // Expect it to resolve successfully
      await expect(timedPromise).resolves.toBe("success");
    });

    it("should use custom error message when provided", async () => {
      // Create a promise that takes longer than timeout
      const slowPromise = new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      const customMessage = "Custom timeout message";
      const timedPromise = promiseTimeout(slowPromise, 1000, customMessage);

      // Expect it to throw with custom message
      await expect(timedPromise).rejects.toThrow(customMessage);
    }, 5000);
  });
});
