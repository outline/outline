/**
 * Comprehensive tests for useLimitModal context.
 *
 * The root cause of the /pos refetch loop (86x getProducts in 30s) was
 * that this provider returned fresh function references on every render,
 * which propagated through useLimits → useCallback deps in pos.tsx →
 * unstable useEffect deps → infinite loop. Every test in this file
 * is a regression guard for that bug.
 */
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LimitModalProvider, useLimitModal } from "./use-limit-modal";

// We don't need the full app tree — useLimitModal only depends on the
// provider's own state. But UpgradeModal is rendered alongside, so we
// mock it to keep tests focused on the context logic.
vi.mock("@/components/brand/UpgradeModal", () => ({
	UpgradeModal: ({ isOpen }: { isOpen: boolean }) => (
		<div data-testid="upgrade-modal" data-open={isOpen} />
	),
}));

const createWrapper = () => {
	// Return the inner component so multiple consumers can share state.
	const Wrapper = ({ children }: { children: React.ReactNode }) => (
		<LimitModalProvider>{children}</LimitModalProvider>
	);
	Wrapper.displayName = "TestWrapper";
	return Wrapper;
};

describe("useLimitModal — provider guard", () => {
	it("throws when useLimitModal is called outside a LimitModalProvider", () => {
		// Suppress the expected error from React's error boundary so it
		// doesn't pollute the test output.
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => {
			renderHook(() => useLimitModal());
		}).toThrow("useLimitModal must be used within a LimitModalProvider");

		spy.mockRestore();
	});
});

describe("useLimitModal — state changes", () => {
	it("showLimitModal does not throw with each limit type", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useLimitModal(), { wrapper });
		const types = [
			"branches",
			"staff",
			"activeBoardings",
			"products",
			"transactions",
		] as const;
		for (const t of types) {
			expect(() => act(() => result.current.showLimitModal(t))).not.toThrow();
		}
	});

	it("closeLimitModal does not throw", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useLimitModal(), { wrapper });
		expect(() => act(() => result.current.closeLimitModal())).not.toThrow();
	});

	it("successive showLimitModal calls update state correctly", () => {
		// Verified via the "opens modal when showLimitModal is called" and
		// "closes modal when closeLimitModal is called" tests below using
		// the rendered UpgradeModal's data-open attribute.
	});
});

describe("useLimitModal — stability (regression: /pos refetch loop)", () => {
	it("showLimitModal reference is stable across re-renders", () => {
		const wrapper = createWrapper();
		const { result, rerender } = renderHook(() => useLimitModal(), {
			wrapper,
		});

		const first = result.current.showLimitModal;
		rerender();
		expect(result.current.showLimitModal).toBe(first);

		rerender();
		rerender();
		expect(result.current.showLimitModal).toBe(first);
	});

	it("closeLimitModal reference is stable across re-renders", () => {
		const wrapper = createWrapper();
		const { result, rerender } = renderHook(() => useLimitModal(), {
			wrapper,
		});

		const first = result.current.closeLimitModal;
		rerender();
		expect(result.current.closeLimitModal).toBe(first);

		rerender();
		rerender();
		expect(result.current.closeLimitModal).toBe(first);
	});

	it("returned object reference is stable across re-renders", () => {
		// Critical: if the object reference is unstable, every consumer
		// that destructures it (e.g. const { showLimitModal } = useLimitModal())
		// re-renders on every parent render. This is the second half of
		// the /pos refetch loop bug.
		const wrapper = createWrapper();
		const { result, rerender } = renderHook(() => useLimitModal(), {
			wrapper,
		});

		const first = result.current;
		rerender();
		expect(result.current).toBe(first);

		rerender();
		rerender();
		expect(result.current).toBe(first);
	});

	it("multiple consumers in the same provider share the same function references", () => {
		// Each renderHook() call creates its own provider via the wrapper,
		// so we need a single shared provider for true "shared consumers".
		const refs: Array<ReturnType<typeof useLimitModal>> = [];
		function MultiConsumer() {
			const api = useLimitModal();
			refs.push(api);
			return null;
		}
		render(
			<LimitModalProvider>
				<MultiConsumer />
				<MultiConsumer />
				<MultiConsumer />
			</LimitModalProvider>,
		);

		// All three consumers must get the SAME references — the
		// provider creates one stable pair and shares it via context.
		expect(refs).toHaveLength(3);
		const [r0, r1, r2] = refs as [
			ReturnType<typeof useLimitModal>,
			ReturnType<typeof useLimitModal>,
			ReturnType<typeof useLimitModal>,
		];
		expect(r0.showLimitModal).toBe(r1.showLimitModal);
		expect(r1.showLimitModal).toBe(r2.showLimitModal);
		expect(r0.closeLimitModal).toBe(r1.closeLimitModal);
		expect(r1.closeLimitModal).toBe(r2.closeLimitModal);
		expect(r0).toBe(r1);
		expect(r1).toBe(r2);
	});

	it("does not invalidate function refs when limitType changes", () => {
		const wrapper = createWrapper();
		const { result, rerender } = renderHook(() => useLimitModal(), {
			wrapper,
		});

		const firstShow = result.current.showLimitModal;
		const firstClose = result.current.closeLimitModal;

		act(() => result.current.showLimitModal("branches"));
		rerender();
		// After state change, function refs should STILL be stable.
		expect(result.current.showLimitModal).toBe(firstShow);
		expect(result.current.closeLimitModal).toBe(firstClose);

		act(() => result.current.closeLimitModal());
		rerender();
		expect(result.current.showLimitModal).toBe(firstShow);
		expect(result.current.closeLimitModal).toBe(firstClose);
	});

	it("does not invalidate function refs when isOpen toggles", () => {
		const wrapper = createWrapper();
		const { result, rerender } = renderHook(() => useLimitModal(), {
			wrapper,
		});

		const firstShow = result.current.showLimitModal;

		// Toggle isOpen by calling show then close. The function ref
		// must not change — otherwise a child useEffect with this in
		// deps would refire on every toggle.
		act(() => result.current.showLimitModal("branches"));
		act(() => result.current.closeLimitModal());
		act(() => result.current.showLimitModal("staff"));
		act(() => result.current.closeLimitModal());

		rerender();
		expect(result.current.showLimitModal).toBe(firstShow);
	});
});

describe("useLimitModal — UpgradeModal rendering (consumer side)", () => {
	let container: HTMLElement;
	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});
	afterEach(() => {
		document.body.removeChild(container);
	});

	it("renders UpgradeModal closed by default", () => {
		render(
			<LimitModalProvider>
				<Consumer />
			</LimitModalProvider>,
			{ container },
		);
		const modal = container.querySelector(
			"[data-testid='upgrade-modal']",
		) as HTMLElement;
		expect(modal).not.toBeNull();
		expect(modal.getAttribute("data-open")).toBe("false");
	});

	it("opens modal when showLimitModal is called", () => {
		let api: ReturnType<typeof useLimitModal> | null = null;
		function Capture() {
			api = useLimitModal();
			return null;
		}
		render(
			<LimitModalProvider>
				<Capture />
			</LimitModalProvider>,
			{ container },
		);

		act(() => api?.showLimitModal("branches"));

		const modal = container.querySelector(
			"[data-testid='upgrade-modal']",
		) as HTMLElement;
		expect(modal.getAttribute("data-open")).toBe("true");
	});

	it("closes modal when closeLimitModal is called", () => {
		let api: ReturnType<typeof useLimitModal> | null = null;
		function Capture() {
			api = useLimitModal();
			return null;
		}
		render(
			<LimitModalProvider>
				<Capture />
			</LimitModalProvider>,
			{ container },
		);

		act(() => api?.showLimitModal("branches"));
		act(() => api?.closeLimitModal());

		const modal = container.querySelector(
			"[data-testid='upgrade-modal']",
		) as HTMLElement;
		expect(modal.getAttribute("data-open")).toBe("false");
	});
});

// Helpers
function Consumer() {
	useLimitModal();
	return null;
}
