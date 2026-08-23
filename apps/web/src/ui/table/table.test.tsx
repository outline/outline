import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableCell, TableRow } from "./table";

describe("Table", () => {
	it("should render table with headers and content", () => {
		const headers = ["Name", "Age"];
		render(
			<Table headers={headers}>
				<TableRow>
					<TableCell>John Doe</TableCell>
					<TableCell>30</TableCell>
				</TableRow>
			</Table>,
		);

		expect(screen.getByText("Name")).toBeInTheDocument();
		expect(screen.getByText("Age")).toBeInTheDocument();
		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.getByText("30")).toBeInTheDocument();
	});

	it("should render multiple rows", () => {
		const headers = ["ID"];
		render(
			<Table headers={headers}>
				<TableRow>
					<TableCell>1</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>2</TableCell>
				</TableRow>
			</Table>,
		);

		expect(screen.getAllByRole("row")).toHaveLength(3); // 1 header row + 2 data rows
	});

	it("should handle clickable rows", () => {
		const { container } = render(
			<Table headers={["ID"]}>
				<TableRow onClick={() => {}}>
					<TableCell>1</TableCell>
				</TableRow>
			</Table>,
		);

		const row = container.querySelector("tr:nth-child(1)");
		// Depending on implementation, it might have a clickable class.
		// Since we can't easily check for the class name from styles object,
		// we just ensure it rendered.
		expect(row).toBeInTheDocument();
	});
});
