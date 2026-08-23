import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

describe("Modal Component", () => {
	it("should not render when isOpen is false", () => {
		const { container } = render(
			<Modal isOpen={false} onClose={() => {}} title="Test Modal">
				Content
			</Modal>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("should render title and children when isOpen is true", () => {
		render(
			<Modal isOpen={true} onClose={() => {}} title="Test Modal">
				Modal Content
			</Modal>,
		);
		expect(screen.getByText("Test Modal")).toBeDefined();
		expect(screen.getByText("Modal Content")).toBeDefined();
	});

	it("should trigger onClose when close button is clicked", () => {
		const handleClose = vi.fn();
		render(
			<Modal isOpen={true} onClose={handleClose} title="Test Modal">
				Content
			</Modal>,
		);
		const closeButton = screen.getByLabelText("Close modal");
		fireEvent.click(closeButton);
		expect(handleClose).toHaveBeenCalled();
	});

	it("should trigger onClose when escape key is pressed on the overlay", () => {
		const handleClose = vi.fn();
		const { container } = render(
			<Modal isOpen={true} onClose={handleClose} title="Test Modal">
				Content
			</Modal>,
		);
		// The overlay has role="none" but we can still target it by class or find the parent
		const overlay = container.querySelector(".fixed.inset-0");
		if (overlay) {
			fireEvent.keyDown(overlay, { key: "Escape" });
			expect(handleClose).toHaveBeenCalled();
		}
	});
});
