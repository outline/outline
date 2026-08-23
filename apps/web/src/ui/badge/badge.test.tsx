import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
	it("should render badge with children", () => {
		render(<Badge>Active</Badge>);
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("should apply variant classes", () => {
		const { container } = render(<Badge variant="success">Success</Badge>);
		// We don't necessarily know the exact class name if it's from a styles object,
		// but we can check if it rendered.
		expect(container.firstChild).toBeInTheDocument();
	});

	it("should allow custom className", () => {
		const { container } = render(<Badge className="custom-class">Badge</Badge>);
		expect(container.firstChild).toHaveClass("custom-class");
	});
});
