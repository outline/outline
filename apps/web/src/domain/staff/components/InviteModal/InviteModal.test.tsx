import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteModal } from "./InviteModal";

// Mock API functions
vi.mock("@/lib/api/branches.functions", () => ({
	getBranches: vi.fn(),
}));

vi.mock("@/lib/api/staff.functions", () => ({
	inviteStaff: vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const createWrapper = () => {
	const queryClient = new QueryClient();
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("InviteModal Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render correctly", () => {
		render(<InviteModal onCancel={() => {}} />, { wrapper: createWrapper() });
		expect(screen.getByText("Tambah Anggota Tim")).toBeDefined();
		expect(screen.getByLabelText(/Alamat Email/i)).toBeDefined();
	});

	it("should render submit button", () => {
		render(<InviteModal onCancel={() => {}} />, { wrapper: createWrapper() });
		const submitBtn = screen.getByRole("button", { name: /Simpan/i });
		expect(submitBtn).toBeInTheDocument();
	});
});
