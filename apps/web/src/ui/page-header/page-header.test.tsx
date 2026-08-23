import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "./page-header";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

describe("PageHeader", () => {
	it("should render title and description", () => {
		render(<PageHeader title="Dashboard" description="Welcome back" />);

		expect(screen.getByText("Dashboard")).toBeInTheDocument();
		expect(screen.getByText("Welcome back")).toBeInTheDocument();
	});

	it("should render breadcrumbs", () => {
		const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Settings" }];
		render(<PageHeader title="Settings" breadcrumbs={breadcrumbs} />);

		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getAllByText("Settings")).toHaveLength(2);
		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
			"href",
			"/",
		);
	});

	it("should render actions", () => {
		render(
			<PageHeader
				title="Page"
				actions={<button type="button">Action</button>}
			/>,
		);

		// PageHeader renders actions twice (one for desktop, one for mobile)
		expect(screen.getAllByRole("button", { name: "Action" })).toHaveLength(2);
	});

	it("should render back button when backHref is provided", () => {
		const breadcrumbs = [
			{ label: "Parent", href: "/parent" },
			{ label: "Current" },
		];
		render(
			<PageHeader title="Page" backHref="/back" breadcrumbs={breadcrumbs} />,
		);
		const links = screen.getAllByRole("link");
		const backLink = links.find((l) => l.getAttribute("href") === "/back");
		expect(backLink).toBeTruthy();
		expect(backLink).toHaveAttribute("href", "/back");
	});
});
