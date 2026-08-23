import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
	optimisticPatchListItem,
	optimisticRemoveFromList,
	rollbackOptimisticSnapshot,
} from "./optimistic";

type Item = {
	readonly id: string;
	readonly name: string;
	readonly status?: string;
};

describe("optimistic cache helpers", () => {
	it("removes an item and can rollback", async () => {
		const client = new QueryClient();
		const key = ["items", "list"] as const;
		const initial: readonly Item[] = [
			{ id: "1", name: "A" },
			{ id: "2", name: "B" },
		];
		client.setQueryData(key, initial);

		const snapshot = await optimisticRemoveFromList(
			client,
			key,
			(item: Item) => item.id === "1",
		);

		expect(client.getQueryData(key)).toEqual([{ id: "2", name: "B" }]);

		rollbackOptimisticSnapshot(client, snapshot);

		expect(client.getQueryData(key)).toEqual(initial);
	});

	it("patches an item and can rollback", async () => {
		const client = new QueryClient();
		const key = ["items", "list"] as const;
		const initial: readonly Item[] = [
			{ id: "1", name: "A", status: "active" },
			{ id: "2", name: "B", status: "active" },
		];
		client.setQueryData(key, initial);

		const snapshot = await optimisticPatchListItem(
			client,
			key,
			(item: Item) => item.id === "1",
			(item) => ({ ...item, status: "completed" }),
		);

		expect(client.getQueryData(key)).toEqual([
			{ id: "1", name: "A", status: "completed" },
			{ id: "2", name: "B", status: "active" },
		]);

		rollbackOptimisticSnapshot(client, snapshot);

		expect(client.getQueryData(key)).toEqual(initial);
	});

	it("preserves missing cache without crashing", async () => {
		const client = new QueryClient();
		const key = ["missing", "list"] as const;

		const snapshot = await optimisticRemoveFromList(
			client,
			key,
			(item: Item) => item.id === "1",
		);

		expect(snapshot.previousData).toBeUndefined();
		expect(client.getQueryData(key)).toBeUndefined();
	});
});
