import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Button } from "./button";

test("renders button correctly (snapshot)", () => {
	const { container } = render(<Button>Click me</Button>);
	expect(container).toMatchSnapshot();
});

test("handles click events (functional)", () => {
	const onClickMock = vi.fn();
	render(<Button onClick={onClickMock}>Click me</Button>);

	const button = screen.getByRole("button", { name: /click me/i });
	fireEvent.click(button);

	expect(onClickMock).toHaveBeenCalledTimes(1);
});
