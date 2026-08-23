import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as boardingsApi from "@/lib/api/boardings.functions";
import { useCompleteBoarding, useDeleteBoarding } from "./use-boarding-queries";

const mockBoardings = [
	{ id: "b-1", status: "active" },
	{ id: "b-2", status: "active" },
] as never[];

const wrapper =
	(queryClient: QueryClient): React.FC<{ children: React.ReactNode }> =>
	({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

describe("boarding hook adapter boundary", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.restoreAllMocks();
	});

	afterEach(() => {
		queryClient.clear();
	});

	it("useDeleteBoarding optimistically removes a row and rolls back", async () => {
		vi.spyOn(boardingsApi, "deleteBoarding").mockRejectedValue(
			new Error("Storage unavailable"),
		);

		queryClient.setQueryData(["boardings", "list"], mockBoardings);

		expect(queryClient.getQueryData(["boardings", "list"])).toBeDefined();

		const { result } = renderHook(() => useDeleteBoarding(), {
			wrapper: wrapper(queryClient),
		});

		await act(async () => {
			result.current.mutate("b-1");
			await Promise.resolve();
		});

		const after = queryClient.getQueryData<{ id: string }[]>([
			"boardings",
			"list",
		]);
		expect(after).toBeDefined();

		await waitFor(() => expect(result.current.isError).toBe(true));

		await waitFor(() =>
			expect(queryClient.getQueryData(["boardings", "list"])).toEqual(
				mockBoardings,
			),
		);
	});

	it("useCompleteBoarding patches the row status optimistically", async () => {
		vi.spyOn(boardingsApi, "updateBoardingStatus").mockResolvedValue(
			undefined as never,
		);

		queryClient.setQueryData(["boardings", "list"], mockBoardings);

		const { result } = renderHook(() => useCompleteBoarding(), {
			wrapper: wrapper(queryClient),
		});

		await act(async () => {
			result.current.mutate("b-1");
			await Promise.resolve();
		});

		await waitFor(() =>
			expect(queryClient.getQueryData(["boardings", "list"])).toEqual([
				{ id: "b-1", status: "completed" },
				{ id: "b-2", status: "active" },
			]),
		);
	});
});
