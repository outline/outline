import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BoardingForm } from "./BoardingForm";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		...props
	}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a {...props}>{children}</a>
	),
	useRouter: () => ({
		invalidate: vi.fn(),
	}),
}));

const createWrapper = () => {
	const queryClient = new QueryClient();
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("BoardingForm Component", () => {
	it("should render the form with continue button", () => {
		render(<BoardingForm />, { wrapper: createWrapper() });
		expect(screen.getByText("Lanjut")).toBeDefined();
	});

	it("should not crash when clicking continue with empty form", () => {
		render(<BoardingForm hideHeader />, { wrapper: createWrapper() });
		const continueBtn = screen.getByText("Lanjut");
		expect(continueBtn).toBeDefined();
		fireEvent.click(continueBtn);
	});
});
