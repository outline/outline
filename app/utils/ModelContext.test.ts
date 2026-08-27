import { vi } from "vitest";
import {
  isModelContextSupported,
  registerModelContextTool,
  type ModelContextTool,
} from "./ModelContext";

const makeTool = (name: string): ModelContextTool => ({
  name,
  description: "A test tool",
  execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
});

describe("ModelContext", () => {
  afterEach(() => {
    delete window.document.modelContext;
  });

  describe("#isModelContextSupported", () => {
    it("should return false when the API is unavailable", () => {
      expect(isModelContextSupported()).toBe(false);
    });

    it("should return true when the API is available", () => {
      window.document.modelContext = { registerTool: vi.fn() };
      expect(isModelContextSupported()).toBe(true);
    });
  });

  describe("#registerModelContextTool", () => {
    it("should return false when the API is unavailable", () => {
      const controller = new AbortController();
      expect(registerModelContextTool(makeTool("one"), controller.signal)).toBe(
        false
      );
    });

    it("should register a tool and skip duplicate names", () => {
      const registerTool = vi.fn();
      window.document.modelContext = { registerTool };
      const controller = new AbortController();

      expect(registerModelContextTool(makeTool("two"), controller.signal)).toBe(
        true
      );
      expect(registerModelContextTool(makeTool("two"), controller.signal)).toBe(
        false
      );
      expect(registerTool).toHaveBeenCalledTimes(1);

      controller.abort();
    });

    it("should allow re-registration after the signal aborts", () => {
      const registerTool = vi.fn();
      window.document.modelContext = { registerTool };

      const first = new AbortController();
      expect(registerModelContextTool(makeTool("three"), first.signal)).toBe(
        true
      );
      first.abort();

      const second = new AbortController();
      expect(registerModelContextTool(makeTool("three"), second.signal)).toBe(
        true
      );
      expect(registerTool).toHaveBeenCalledTimes(2);

      second.abort();
    });

    it("should not register when the signal is already aborted", () => {
      const registerTool = vi.fn();
      window.document.modelContext = { registerTool };
      const controller = new AbortController();
      controller.abort();

      expect(
        registerModelContextTool(makeTool("four"), controller.signal)
      ).toBe(false);
      expect(registerTool).not.toHaveBeenCalled();
    });
  });
});
