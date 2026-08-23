export type TApiResponse<T = unknown> =
	| {
			readonly success: true;
			readonly data: T;
			readonly meta?: Record<string, unknown>;
	  }
	| {
			readonly success: false;
			readonly error: string;
			readonly details?: unknown;
	  };

export type TPaginationInput = {
	readonly page: number;
	readonly limit: number;
};

export type TPaginated<T> = {
	readonly data: readonly T[];
	readonly total: number;
	readonly page: number;
	readonly limit: number;
	readonly totalPages: number;
};
