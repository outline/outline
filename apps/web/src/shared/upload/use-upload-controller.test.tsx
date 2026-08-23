import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUploadController } from "./use-upload-controller";

const makeFile = (size = 4) =>
	new File([new Uint8Array(size)], "pet.png", { type: "image/png" });

describe("useUploadController", () => {
	it("starts in the idle state", () => {
		const { result } = renderHook(() =>
			useUploadController(async () => ({ url: "https://cdn.test/x.png" })),
		);
		expect(result.current.state).toEqual({ status: "idle" });
	});

	it("moves to success when the command resolves", async () => {
		const command = vi
			.fn()
			.mockResolvedValue({ url: "https://cdn.test/pet.png" });
		const { result } = renderHook(() => useUploadController(command));

		let returnedState: Awaited<ReturnType<typeof result.current.upload>>;
		await act(async () => {
			returnedState = await result.current.upload(makeFile());
		});

		expect(result.current.state).toEqual({
			status: "success",
			url: "https://cdn.test/pet.png",
		});
		expect(returnedState!).toEqual({
			status: "success",
			url: "https://cdn.test/pet.png",
		});
		expect(command).toHaveBeenCalledOnce();
	});

	it("moves to error with extractErrorMessage on rejection", async () => {
		const command = vi.fn().mockRejectedValue(new Error("Storage unavailable"));
		const { result } = renderHook(() => useUploadController(command));

		let returnedState: Awaited<ReturnType<typeof result.current.upload>>;
		await act(async () => {
			returnedState = await result.current.upload(makeFile());
		});

		expect(result.current.state).toEqual({
			status: "error",
			message: "Storage unavailable",
		});
		expect(returnedState!).toEqual({
			status: "error",
			message: "Storage unavailable",
		});
	});

	it("rejects empty files at the validating step", async () => {
		const command = vi.fn();
		const { result } = renderHook(() => useUploadController(command));

		let returnedState: Awaited<ReturnType<typeof result.current.upload>>;
		await act(async () => {
			returnedState = await result.current.upload(makeFile(0));
		});

		expect(result.current.state).toEqual({
			status: "error",
			message: "File kosong",
		});
		expect(returnedState!).toEqual({
			status: "error",
			message: "File kosong",
		});
		expect(command).not.toHaveBeenCalled();
	});

	it("reset() returns to idle from any state", async () => {
		const command = vi
			.fn()
			.mockResolvedValue({ url: "https://cdn.test/pet.png" });
		const { result } = renderHook(() => useUploadController(command));

		await act(async () => {
			await result.current.upload(makeFile());
		});
		expect(result.current.state.status).toBe("success");

		act(() => {
			result.current.reset();
		});
		expect(result.current.state).toEqual({ status: "idle" });
	});
});
