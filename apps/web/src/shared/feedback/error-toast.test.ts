import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/utils/error", () => ({
	extractErrorMessage: vi.fn((_err, fallback) => fallback ?? "fallback"),
}));

const { toast } = await import("@/components/ui");
const { extractErrorMessage } = await import("@/shared/utils/error");
const { showErrorToast, showSuccessToast } = await import("./error-toast");

describe("showErrorToast", () => {
	it("calls toast.error with title and parsed message", () => {
		showErrorToast(new Error("test"), "Title", "Fallback");
		expect(extractErrorMessage).toHaveBeenCalledWith(
			new Error("test"),
			"Fallback",
		);
		expect(toast.error).toHaveBeenCalledWith("Title", {
			description: "Fallback",
		});
	});
});

describe("showSuccessToast", () => {
	it("calls toast.success with title and description", () => {
		showSuccessToast("OK", "Done");
		expect(toast.success).toHaveBeenCalledWith("OK", { description: "Done" });
	});

	it("calls toast.success with title only", () => {
		showSuccessToast("OK");
		expect(toast.success).toHaveBeenCalledWith("OK", {
			description: undefined,
		});
	});
});
