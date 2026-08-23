import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinancialSummaryGrid } from "./FinancialSummaryGrid";

vi.mock("@/shared/i18n", () => ({
	useLanguage: vi.fn(() => ({ language: "id" })),
}));

describe("FinancialSummaryGrid Component", () => {
	it("should show skeleton loaders when isLoading is true", () => {
		const { container } = render(<FinancialSummaryGrid isLoading={true} />);
		expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
			0,
		);
	});

	it("should render financial data", () => {
		const mockSummary = {
			monthlyRevenue: 5000000,
			monthlyExpenses: 2000000,
			monthlyProfit: 3000000,
			pettyCashBalance: 1000000,
			revenueTrend: [],
		};

		render(<FinancialSummaryGrid summary={mockSummary} isLoading={false} />);

		expect(screen.getByText(/Pendapatan Bulan Ini/i)).toBeDefined();
		expect(screen.getByText(/5\.000\.000/)).toBeDefined();
		expect(screen.getByText(/Laba Bersih/i)).toBeDefined();
		expect(screen.getByText(/3\.000\.000/)).toBeDefined();
	});
});
