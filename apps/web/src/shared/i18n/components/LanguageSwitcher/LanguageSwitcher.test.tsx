import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "../../useLanguage";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Mock useLanguage hook
vi.mock("../../useLanguage", () => ({
	useLanguage: vi.fn(),
}));

// Mock DropdownMenu components to simplify testing
vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick: () => void;
	}) => (
		<button
			type="button"
			onClick={onClick}
			role="menuitem"
			className="w-full text-left"
		>
			{children}
		</button>
	),
}));

describe("LanguageSwitcher", () => {
	const mockSupportedLanguages = {
		English: "en",
		Indonesian: "id",
	};

	const mockChangeLanguage = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useLanguage).mockReturnValue({
			language: "en",
			changeLanguage: mockChangeLanguage,
			supportedLanguages: mockSupportedLanguages,
		} as unknown as ReturnType<typeof useLanguage>);
	});

	it("should render current language", () => {
		render(<LanguageSwitcher />);
		expect(screen.getByLabelText("Change language")).toHaveTextContent("en");
	});

	it("should render all supported languages", () => {
		render(<LanguageSwitcher />);

		expect(screen.getByText("English")).toBeInTheDocument();
		expect(screen.getByText("Indonesian")).toBeInTheDocument();
	});

	it("should call changeLanguage when a language is clicked", () => {
		render(<LanguageSwitcher />);

		const indonesianItem = screen.getByText("Indonesian");
		fireEvent.click(indonesianItem);

		expect(mockChangeLanguage).toHaveBeenCalledWith("id");
	});
});
