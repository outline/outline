import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./form-field";

describe("FormField", () => {
	it("should render label and children", () => {
		render(
			<FormField label="Username">
				<input id="username" type="text" />
			</FormField>,
		);

		expect(screen.getByText("Username")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("should render required asterisk", () => {
		render(
			<FormField label="Username" required>
				<input id="username" type="text" />
			</FormField>,
		);

		expect(screen.getByText("*")).toBeInTheDocument();
	});

	it("should render error message", () => {
		render(
			<FormField label="Username" error="Required field">
				<input id="username" type="text" />
			</FormField>,
		);

		expect(screen.getByText("Required field")).toBeInTheDocument();
	});

	it("should link label to child input via id", () => {
		render(
			<FormField label="Username">
				<input type="text" />
			</FormField>,
		);

		const label = screen.getByText("Username");
		const input = screen.getByRole("textbox");

		expect(label).toHaveAttribute("for", input.id);
	});
});
