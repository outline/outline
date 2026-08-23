import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
	it("should render default title and description", () => {
		render(<ErrorState />);

		expect(screen.getByText("Terjadi Kesalahan Aplikasi")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Mohon maaf, sistem mengalami kendala teknis. Tim kami sedang menanganinya.",
			),
		).toBeInTheDocument();
	});

	it("should render custom title and description", () => {
		render(
			<ErrorState title="Custom Error" description="Custom Description" />,
		);

		expect(screen.getByText("Custom Error")).toBeInTheDocument();
		expect(screen.getByText("Custom Description")).toBeInTheDocument();
	});

	it("should call onRetry when retry button is clicked", () => {
		const onRetry = vi.fn();
		render(<ErrorState onRetry={onRetry} />);

		const retryButton = screen.getByRole("button", { name: "Coba Lagi" });
		fireEvent.click(retryButton);

		expect(onRetry).toHaveBeenCalledTimes(1);
	});
});
