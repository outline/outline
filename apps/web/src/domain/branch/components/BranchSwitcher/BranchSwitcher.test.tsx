import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BranchSwitcher } from "./BranchSwitcher";

describe("BranchSwitcher Component", () => {
	const mockBranches = [
		{ id: "b1", name: "Main Branch", is_active: true },
		{ id: "b2", name: "Sub Branch", is_active: true },
		{ id: "b3", name: "Inactive Branch", is_active: false },
	];

	it("should render selected branch name", () => {
		render(
			<BranchSwitcher
				branches={mockBranches}
				selectedBranchId="b1"
				onBranchSelect={() => {}}
				businessName="My Business"
			/>,
		);
		expect(screen.getByText("Main Branch")).toBeDefined();
	});

	it("should show business name", () => {
		render(
			<BranchSwitcher
				branches={mockBranches}
				selectedBranchId="b1"
				onBranchSelect={() => {}}
				businessName="My Business"
			/>,
		);
		expect(screen.getByText("My Business")).toBeDefined();
	});
});
