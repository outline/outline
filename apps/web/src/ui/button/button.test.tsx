import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button Component", () => {
	it("should render children", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByText("Click me")).toBeDefined();
	});

	it("should trigger onClick when clicked", () => {
		const handleClick = vi.fn();
		render(<Button onClick={handleClick}>Click me</Button>);
		fireEvent.click(screen.getByText("Click me"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("should be disabled when disabled prop is true", () => {
		render(<Button disabled>Click me</Button>);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
	});

	it("should apply variant classes correctly", () => {
		const { container } = render(<Button variant="outline">Outline</Button>);
		expect((container.firstChild as HTMLElement)?.className).toContain(
			"border-neutral-200",
		);
	});
});
