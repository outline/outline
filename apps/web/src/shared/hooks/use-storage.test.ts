import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Storage } from "../utils/storage";
import { useStorage } from "./use-storage";

// Mock Storage utility
vi.mock("../utils/storage", () => ({
	Storage: {
		get: vi.fn(),
		set: vi.fn(),
	},
}));

describe("useStorage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with value from storage if available", () => {
		vi.mocked(Storage.get).mockReturnValue("stored value");
		const { result } = renderHook(() => useStorage("test-key", "default"));
		expect(result.current[0]).toBe("stored value");
	});

	it("should initialize with default value if storage is empty", () => {
		vi.mocked(Storage.get).mockReturnValue(null);
		const { result } = renderHook(() => useStorage("test-key", "default"));
		expect(result.current[0]).toBe("default");
	});

	it("should update storage and state when setValue is called", () => {
		vi.mocked(Storage.get).mockReturnValue(null);
		const { result } = renderHook(() => useStorage("test-key", "default"));

		act(() => {
			result.current[1]("new value");
		});

		expect(result.current[0]).toBe("new value");
		expect(Storage.set).toHaveBeenCalledWith("test-key", "new value");
	});

	it("should respond to window storage events", () => {
		vi.mocked(Storage.get).mockReturnValue("old");
		const { result } = renderHook(() => useStorage("test-key", "old"));

		act(() => {
			const event = new StorageEvent("storage", {
				key: "test-key",
				newValue: JSON.stringify("external update"),
			});
			window.dispatchEvent(event);
		});

		expect(result.current[0]).toBe("external update");
	});
});
