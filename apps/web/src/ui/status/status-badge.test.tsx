import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
	it("should render the label", () => {
		render(<StatusBadge type="success" label="Active" />);
		expect(screen.getByText("Active")).toBeDefined();
	});

	it("should apply correct styles for type", () => {
		const { container } = render(<StatusBadge type="error" label="Failed" />);
		expect((container.firstChild as HTMLElement)?.className).toContain(
			"bg-rose-50",
		);
	});
});
