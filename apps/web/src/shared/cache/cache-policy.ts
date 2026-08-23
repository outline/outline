export const CACHE_TIMES = {
	realtime: {
		staleTime: 15_000,
		gcTime: 2 * 60_000,
	},
	operational: {
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	},
	session: {
		staleTime: 60_000,
		gcTime: 5 * 60_000,
	},
	reference: {
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
	},
	static: {
		staleTime: 15 * 60_000,
		gcTime: 60 * 60_000,
	},
} as const;

export type TCacheTier = keyof typeof CACHE_TIMES;

export const QUERY_POLICY = {
	realtime: CACHE_TIMES.realtime,
	operational: CACHE_TIMES.operational,
	session: CACHE_TIMES.session,
	reference: CACHE_TIMES.reference,
	static: CACHE_TIMES.static,
} as const;
