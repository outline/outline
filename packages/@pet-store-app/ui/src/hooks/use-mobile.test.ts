import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("should return true if window width is below breakpoint", () => {
		// Mock matchMedia
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});

		// Set innerWidth
		window.innerWidth = 500;

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);
	});

	it("should return false if window width is above breakpoint", () => {
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});

		window.innerWidth = 1024;

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});
});
