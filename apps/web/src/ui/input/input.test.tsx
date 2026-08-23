import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";

describe("Input Component", () => {
	it("should render with correct initial value", () => {
		render(<Input value="initial" onChange={() => {}} />);
		expect(screen.getByDisplayValue("initial")).toBeDefined();
	});

	it("should trigger onChange when typing", () => {
		const handleChange = vi.fn();
		render(<Input onChange={handleChange} />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "new value" } });
		expect(handleChange).toHaveBeenCalled();
	});

	it("should show error styling if error prop is provided", () => {
		render(<Input error="Required field" />);
		const input = screen.getByRole("textbox");
		expect(input.className).toContain("border-rose-300");
		expect(screen.getByText("Required field")).toBeDefined();
	});

	it("should be disabled if disabled prop is passed", () => {
		render(<Input disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});
});
