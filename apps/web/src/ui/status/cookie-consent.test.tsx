import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsent } from "./cookie-consent";

// Mock Cookie utility
vi.mock("@/shared/utils/cookie", () => ({
	Cookie: {
		get: vi.fn(),
		set: vi.fn(),
	},
}));

import { Cookie } from "@/shared/utils/cookie";

describe("CookieConsent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	it("should show consent banner after delay if not accepted", async () => {
		vi.mocked(Cookie.get).mockReturnValue(null);

		render(<CookieConsent />);

		// Should not be visible initially
		expect(screen.queryByText("Cookie & Privasi")).not.toBeInTheDocument();

		// Fast-forward 1500ms
		act(() => {
			vi.advanceTimersByTime(1500);
		});

		expect(screen.getByText("Cookie & Privasi")).toBeInTheDocument();
	});

	it("should not show if consent already exists", () => {
		vi.mocked(Cookie.get).mockReturnValue("true");

		render(<CookieConsent />);

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		expect(screen.queryByText("Cookie & Privasi")).not.toBeInTheDocument();
	});

	it("should save consent and hide when 'Setuju' is clicked", () => {
		vi.mocked(Cookie.get).mockReturnValue(null);

		render(<CookieConsent />);

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		const acceptButton = screen.getByText("Setuju");
		fireEvent.click(acceptButton);

		expect(Cookie.set).toHaveBeenCalledWith("cookie-consent", "true", 365);
		expect(screen.queryByText("Cookie & Privasi")).not.toBeInTheDocument();
	});

	it("should hide when 'Nanti' is clicked without saving", () => {
		vi.mocked(Cookie.get).mockReturnValue(null);

		render(<CookieConsent />);

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		const laterButton = screen.getByText("Nanti");
		fireEvent.click(laterButton);

		expect(Cookie.set).not.toHaveBeenCalled();
		expect(screen.queryByText("Cookie & Privasi")).not.toBeInTheDocument();
	});
});
