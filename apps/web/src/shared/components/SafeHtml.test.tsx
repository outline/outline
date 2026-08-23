import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafeHtml } from "./SafeHtml";

describe("SafeHtml", () => {
	it("renders sanitized allowlisted markup", () => {
		const { container } = render(
			<SafeHtml html="<p>Jl. Mawar <strong>No. 5</strong></p>" />,
		);
		expect(container.querySelector("strong")?.textContent).toBe("No. 5");
	});

	it("strips a dangerous onerror image", () => {
		const { container } = render(
			<SafeHtml html={'<img src="x" onerror="alert(1)">'} />,
		);
		expect(container.querySelector("img")).toBeNull();
		expect(container.innerHTML).not.toContain("onerror");
	});

	it("shows the fallback for empty input", () => {
		const { container } = render(<SafeHtml html={null} fallback="-" />);
		expect(container.textContent).toBe("-");
	});

	it("applies the className to the wrapper", () => {
		const { container } = render(
			<SafeHtml html="<p>x</p>" className="test-cls" />,
		);
		expect(container.firstElementChild?.className).toContain("test-cls");
	});
});
