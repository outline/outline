import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
	it("should render title and description", () => {
		render(
			<EmptyState title="No Data" description="There is no data to display." />,
		);

		expect(screen.getByText("No Data")).toBeInTheDocument();
		expect(
			screen.getByText("There is no data to display."),
		).toBeInTheDocument();
	});

	it("should render action button", () => {
		render(
			<EmptyState
				title="No Data"
				action={<button type="button">Add Data</button>}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Add Data" }),
		).toBeInTheDocument();
	});

	it("should render icon when provided", () => {
		const MockIcon = () => <svg data-testid="mock-icon" />;
		render(<EmptyState title="No Data" icon={MockIcon} />);

		expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
	});
});
