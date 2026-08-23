import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type TOptimisticSnapshot<TData> = {
	readonly queryKey: QueryKey;
	readonly previousData: TData | undefined;
};

/**
 * Optimistically remove an item from a cached list.
 *
 * Cancels in-flight queries for the same key, snapshots the previous data
 * for rollback, then applies the filtered list. Returns `undefined`
 * `previousData` when no cache existed so callers can pass the snapshot
 * straight to `rollbackOptimisticSnapshot`.
 */
export const optimisticRemoveFromList = async <TItem>(
	queryClient: QueryClient,
	queryKey: QueryKey,
	predicate: (item: TItem) => boolean,
): Promise<TOptimisticSnapshot<readonly TItem[]>> => {
	await queryClient.cancelQueries({ queryKey });
	const previousData = queryClient.getQueryData<readonly TItem[]>(queryKey);

	if (previousData) {
		queryClient.setQueryData(
			queryKey,
			previousData.filter((item) => !predicate(item)),
		);
	}

	return { queryKey, previousData };
};

/**
 * Optimistically patch an item in a cached list. The patch function is
 * applied per item; non-matching items are returned unchanged.
 */
export const optimisticPatchListItem = async <TItem>(
	queryClient: QueryClient,
	queryKey: QueryKey,
	predicate: (item: TItem) => boolean,
	patch: (item: TItem) => TItem,
): Promise<TOptimisticSnapshot<readonly TItem[]>> => {
	await queryClient.cancelQueries({ queryKey });
	const previousData = queryClient.getQueryData<readonly TItem[]>(queryKey);

	if (previousData) {
		queryClient.setQueryData(
			queryKey,
			previousData.map((item) => (predicate(item) ? patch(item) : item)),
		);
	}

	return { queryKey, previousData };
};

/**
 * Restore the cache to its pre-optimistic state. No-op if the snapshot
 * is undefined (no cache existed before the optimistic write).
 */
export const rollbackOptimisticSnapshot = <TData>(
	queryClient: QueryClient,
	snapshot: TOptimisticSnapshot<TData> | undefined,
) => {
	if (!snapshot) return;
	queryClient.setQueryData(snapshot.queryKey, snapshot.previousData);
};
