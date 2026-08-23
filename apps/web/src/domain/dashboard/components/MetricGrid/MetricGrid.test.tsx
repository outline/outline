import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "@/shared/i18n";
import { MetricGrid } from "./MetricGrid";

// Mock useLanguage
vi.mock("@/shared/i18n", () => ({
	useLanguage: vi.fn(),
}));

// Mock format utilities - use importOriginal to preserve all exports
vi.mock("@/shared/utils/format", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/shared/utils/format")>();
	return {
		...actual,
		formatCurrency: vi.fn((val) => `Rp ${val}`),
		formatNumber: vi.fn((val) => String(val)),
	};
});

// Polyfill ResizeObserver for recharts
globalThis.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

describe("MetricGrid", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useLanguage).mockReturnValue({ language: "id" } as ReturnType<
			typeof useLanguage
		>);
	});

	it("should render loading state", () => {
		render(<MetricGrid isLoading={true} />);

		const values = screen.getAllByText("-");
		expect(values).toHaveLength(5);
	});

	it("should render metrics correctly", () => {
		const metrics = {
			transactionsToday: 10,
			revenueToday: 1000000,
			activeBoardings: 5,
			lowStockProducts: 3,
			totalCustomers: 50,
			completedMonth: 12,
			activeBranches: 2,
			transactionsGrowth: 15.5,
			revenueGrowth: -3.2,
			volumeData: [],
		};

		render(<MetricGrid metrics={metrics} isLoading={false} />);

		expect(screen.getByText("10")).toBeInTheDocument();
		expect(screen.getByText("Rp 1000000")).toBeInTheDocument();
		expect(screen.getByText("5 hewan")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();

		expect(screen.getByText("Transaksi")).toBeInTheDocument();
		expect(screen.getByText("Pendapatan Harian")).toBeInTheDocument();
		expect(screen.getByText("Penitipan Aktif")).toBeInTheDocument();
		expect(screen.getByText("Low Stock")).toBeInTheDocument();
	});

	it("should render 0 revenue when metrics is null", () => {
		render(<MetricGrid metrics={null} isLoading={false} />);
		expect(screen.getByText("Rp 0")).toBeInTheDocument();
	});
});
