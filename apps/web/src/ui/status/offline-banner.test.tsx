import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "./offline-banner";

vi.mock("@/shared/hooks/use-network", () => ({
	useNetwork: vi.fn(),
}));

// Mock i18n to return correct text
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				"common.offline_title": "Koneksi Terputus",
				"common.offline_desc": "Beberapa fitur mungkin tidak tersedia.",
				"common.unstable_title": "Koneksi Tidak Stabil",
				"common.unstable_desc": "Beberapa fitur mungkin terpengaruh.",
			};
			return translations[key] ?? key;
		},
	}),
}));

import { useNetwork } from "@/shared/hooks/use-network";

describe("OfflineBanner", () => {
	it("should not be visible when online", () => {
		vi.mocked(useNetwork).mockReturnValue({
			isOnline: true,
			isUnstable: false,
		});
		render(<OfflineBanner />);
		expect(screen.queryByText("Koneksi Terputus")).not.toBeInTheDocument();
	});

	it("should show when window triggers offline event", () => {
		vi.mocked(useNetwork).mockReturnValue({
			isOnline: false,
			isUnstable: false,
		});
		render(<OfflineBanner />);

		expect(screen.getByText("Koneksi Terputus")).toBeInTheDocument();
		expect(
			screen.getByText("Beberapa fitur mungkin tidak tersedia."),
		).toBeInTheDocument();
	});

	it("should hide when window triggers online event", () => {
		const { unmount } = render(<OfflineBanner />);
		expect(screen.getByText("Koneksi Terputus")).toBeInTheDocument();

		// Unmount and re-render with online state
		unmount();
		vi.mocked(useNetwork).mockReturnValue({
			isOnline: true,
			isUnstable: false,
		});
		render(<OfflineBanner />);
		expect(screen.queryByText("Koneksi Terputus")).not.toBeInTheDocument();
	});
});
