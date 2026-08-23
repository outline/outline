import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui";
import type { TTenantId } from "@/shared/types/common.types";
import type { TBranch } from "../../branch.types";
import { BranchCard } from "./BranchCard";

// Mock @tanstack/react-router Link
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
		...props
	}: {
		children: React.ReactNode;
		to: string;
		params?: Record<string, string>;
	}) => {
		const href = params
			? Object.entries(params).reduce(
					(acc, [key, val]) => acc.replace(`$${key}`, val),
					to,
				)
			: to;
		return (
			<a href={href} {...props}>
				{children}
			</a>
		);
	},
}));

// Mock toast
vi.mock("@/components/ui", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/components/ui")>();
	return {
		...actual,
		toast: {
			success: vi.fn(),
			error: vi.fn(),
		},
	};
});

// Mock navigator.clipboard
Object.assign(navigator, {
	clipboard: {
		writeText: vi.fn(),
	},
});

describe("BranchCard", () => {
	const mockBranch = {
		id: "branch-1",
		tenantId: "business-1" as TTenantId,
		name: "Jakarta Branch",
		address: "Jl. Utama No. 1",
		phone: "08123456789",
		isActive: true,
		createdAt: new Date("2023-01-01T00:00:00Z"),
		updatedAt: new Date("2023-01-01T00:00:00Z"),
	} as unknown as TBranch;

	const mockOnEdit = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnToggleStatus = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render branch information correctly", () => {
		render(
			<BranchCard
				branch={mockBranch}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onToggleStatus={mockOnToggleStatus}
			/>,
		);

		expect(screen.getByText("Jakarta Branch")).toBeInTheDocument();
		expect(screen.getByText("Aktif")).toBeInTheDocument();
		expect(screen.getByText("Jl. Utama No. 1")).toBeInTheDocument();
		expect(screen.getByText("08123456789")).toBeInTheDocument();
		expect(screen.getByText("branch-1...")).toBeInTheDocument();
	});

	it("should call onEdit when edit button is clicked", () => {
		render(
			<BranchCard
				branch={mockBranch}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onToggleStatus={mockOnToggleStatus}
			/>,
		);

		const editButton = screen.getAllByRole("button")[0] ?? null;
		if (!editButton) throw new Error("Edit button not found");
		fireEvent.click(editButton);

		expect(mockOnEdit).toHaveBeenCalledWith(mockBranch);
	});

	it("should call onToggleStatus when toggle button is clicked", () => {
		render(
			<BranchCard
				branch={mockBranch}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onToggleStatus={mockOnToggleStatus}
			/>,
		);

		const toggleButton = screen.getAllByRole("button")[1] ?? null;
		if (!toggleButton) throw new Error("Toggle button not found");
		fireEvent.click(toggleButton);

		expect(mockOnToggleStatus).toHaveBeenCalledWith(mockBranch);
	});

	it("should call onDelete when delete button is clicked", () => {
		render(
			<BranchCard
				branch={mockBranch}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onToggleStatus={mockOnToggleStatus}
			/>,
		);

		const deleteButton = screen.getAllByRole("button")[2] ?? null;
		if (!deleteButton) throw new Error("Delete button not found");
		fireEvent.click(deleteButton);

		expect(mockOnDelete).toHaveBeenCalledWith(mockBranch);
	});

	it("should copy ID to clipboard when ID is clicked", () => {
		render(
			<BranchCard
				branch={mockBranch}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onToggleStatus={mockOnToggleStatus}
			/>,
		);

		const idButton = screen.getByText("branch-1...");
		fireEvent.click(idButton);

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockBranch.id);
		expect(toast.success).toHaveBeenCalled();
	});

	it("should render placeholder when address or phone is missing", () => {
		const branchWithoutInfo = {
			...mockBranch,
			address: "",
			phone: "",
		} as unknown as TBranch;

		render(
			<BranchCard
				branch={branchWithoutInfo}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onToggleStatus={mockOnToggleStatus}
			/>,
		);

		expect(screen.getByText("Alamat belum diatur")).toBeInTheDocument();
		expect(screen.getByText("No. telp belum diatur")).toBeInTheDocument();
	});
});
