import type {
	TApiResponse,
	TAuthCredentials,
	TAuthResult,
	TBranchContactDto,
	TBranchDto,
	TCreateOrderInput,
	TCustomerDto,
	TCustomerRecordDto,
	TCustomerOrderDto,
	TDashboardSummaryDto,
	TLowStockItem,
	TOrderDto,
	TOrderListParams,
	TOrderListResult,
	TOrderTimelineEntry,
	TProductDto,
	TProductListParams,
	TProductListResult,
	TProductSuggestResult,
	TPetDto,
	TServiceDto,
	TSessionDto,
	TSignupInput,
	TSignupResult,
	TUpdateStatusInput,
	TStaffMemberDto,
	TValidateVoucherInput,
	TVoucherDto,
	TVoucherValidationResult,
	TWebhookEndpoint,
} from "../types";

export class PetsoClientError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly details?: string,
	) {
		super(message);
		this.name = "PetsoClientError";
	}
}

export type PetsoClientConfig = {
	readonly baseUrl: string;
	readonly apiKey?: string;
	readonly businessId?: string;
	readonly branchId?: string;
};

export class PetsoClient {
	private readonly baseUrl: string;
	private readonly apiKey: string | undefined;
	public readonly businessId: string;
	public readonly branchId: string;

	constructor(config: PetsoClientConfig) {
		this.baseUrl = config.baseUrl.replace(/\/+$/, "");
		this.apiKey = config.apiKey;
		this.businessId = config.businessId ?? "";
		this.branchId = config.branchId ?? "";
	}

	private async fetchApi<T>(
		path: string,
		options: {
			method?: "GET" | "POST" | "PATCH" | "DELETE";
			body?: unknown;
			signal?: AbortSignal;
			headers?: Record<string, string>;
			cf?: Record<string, unknown>;
		} = {},
	): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const headers: Record<string, string> = {
			Accept: "application/json",
			...options.headers,
		};
		if (this.apiKey) {
			headers.Authorization = `Bearer ${this.apiKey}`;
		}

		if (options.body !== undefined) {
			headers["Content-Type"] = "application/json";
		}

		let response: Response;
		try {
			response = await fetch(url, {
				method: options.method ?? "GET",
				headers,
				body: options.body !== undefined ? JSON.stringify(options.body) : null,
				credentials: "include",
				signal: options.signal ?? null,
				...(options.cf ? { cf: options.cf } : {}),
			} as RequestInit);
		} catch (error) {
			throw new PetsoClientError(
				0,
				"Unable to reach Pet Store API",
				error instanceof Error ? error.message : undefined,
			);
		}

		const json = (await response
			.json()
			.catch(() => null)) as TApiResponse<T> | null;

		if (!response.ok || !json || json.success === false) {
			const apiError = json && "error" in json ? json.error : undefined;
			const message =
				typeof apiError === "string"
					? apiError
					: apiError?.message ?? `HTTP ${response.status}`;
			const details =
				json && "details" in json
					? String(json.details)
					: typeof apiError === "object" && apiError
						? JSON.stringify(apiError.fields ?? {})
						: undefined;
			throw new PetsoClientError(response.status, message, details);
		}

		if (!("data" in json)) {
			throw new PetsoClientError(500, "Empty response from upstream API");
		}

		return json.data;
	}

	readonly auth = {
		login: (input: TAuthCredentials): Promise<TAuthResult> =>
			this.fetchApi<TAuthResult>("/api/v1/auth/login", {
				method: "POST",
				body: input,
			}),

		signup: (input: TSignupInput): Promise<TSignupResult> =>
			this.fetchApi<TSignupResult>("/api/v1/auth/signup", {
				method: "POST",
				body: input,
			}),

		logout: (): Promise<{ loggedOut: boolean }> =>
			this.fetchApi<{ loggedOut: boolean }>("/api/v1/auth/logout", {
				method: "POST",
			}),

		session: (): Promise<TSessionDto> =>
			this.fetchApi<TSessionDto>("/api/v1/auth/session"),
	};

	readonly admin = {
		products: (): Promise<readonly TProductDto[]> =>
			this.fetchApi<readonly TProductDto[]>("/api/v1/admin/products"),
		customers: (): Promise<readonly TCustomerRecordDto[]> =>
			this.fetchApi<readonly TCustomerRecordDto[]>("/api/v1/admin/customers"),
		pets: (): Promise<readonly TPetDto[]> =>
			this.fetchApi<readonly TPetDto[]>("/api/v1/admin/pets"),
		staff: (): Promise<readonly TStaffMemberDto[]> =>
			this.fetchApi<readonly TStaffMemberDto[]>("/api/v1/admin/staff"),
	};

	readonly products = {
		list: (params?: TProductListParams): Promise<TProductListResult> => {
			const searchParams = new URLSearchParams();
			if (params?.search) searchParams.set("search", params.search);
			if (params?.category) searchParams.set("category", params.category);
			if (params?.isFeatured !== undefined)
				searchParams.set("isFeatured", String(params.isFeatured));
			if (params?.minPrice !== undefined)
				searchParams.set("minPrice", String(params.minPrice));
			if (params?.maxPrice !== undefined)
				searchParams.set("maxPrice", String(params.maxPrice));
			if (params?.sort) searchParams.set("sort", params.sort);
			searchParams.set("limit", String(params?.limit ?? 100));
			if (params?.offset) searchParams.set("offset", String(params.offset));

			return this.fetchApi<TProductListResult>(
				`/api/v1/products?${searchParams.toString()}`,
			);
		},

		get: (id: string): Promise<TProductDto | null> =>
			this.fetchApi<TProductDto>(`/api/v1/products/${id}`).catch((err) => {
				if (err instanceof PetsoClientError && err.status === 404) return null;
				throw err;
			}),

		featured: (): Promise<TProductDto[]> =>
			this.fetchApi<TProductDto[]>("/api/v1/featured"),

		suggest: (query: string): Promise<TProductSuggestResult> =>
			this.fetchApi<TProductDto[]>(
				`/api/v1/products/suggest?q=${encodeURIComponent(query)}`,
			),
	};

	readonly categories = {
		list: (): Promise<string[]> =>
			this.fetchApi<string[]>("/api/v1/categories"),
	};

	readonly vouchers = {
		list: (): Promise<TVoucherDto[]> =>
			this.fetchApi<TVoucherDto[]>("/api/v1/vouchers"),

		validate: (
			input: TValidateVoucherInput,
		): Promise<TVoucherValidationResult> =>
			this.fetchApi<TVoucherValidationResult>("/api/v1/vouchers/validate", {
				method: "POST",
				body: input,
			}),
	};

	readonly branches = {
		list: (): Promise<readonly TBranchDto[]> =>
			this.fetchApi<readonly TBranchDto[]>("/api/v1/branches"),

		get: (branchId: string): Promise<TBranchContactDto> =>
			this.fetchApi<TBranchContactDto>(`/api/v1/branches/${branchId}`),
	};

	readonly services = {
		list: (): Promise<TServiceDto[]> =>
			this.fetchApi<TServiceDto[]>("/api/v1/services"),
	};

	readonly orders = {
		list: (params?: TOrderListParams): Promise<TOrderListResult> => {
			const searchParams = new URLSearchParams();
			if (params?.search) searchParams.set("search", params.search);
			if (params?.status) searchParams.set("status", params.status);
			if (params?.fromDate) searchParams.set("fromDate", params.fromDate);
			if (params?.toDate) searchParams.set("toDate", params.toDate);
			searchParams.set("limit", String(params?.limit ?? 50));
			if (params?.offset) searchParams.set("offset", String(params.offset));

			return this.fetchApi<TOrderListResult>(
				`/api/v1/orders?${searchParams.toString()}`,
			);
		},

		get: (id: string): Promise<TOrderDto | null> =>
			this.fetchApi<TOrderDto>(`/api/v1/orders/${id}`).catch((err) => {
				if (err instanceof PetsoClientError && err.status === 404) return null;
				throw err;
			}),

		create: (
			input: TCreateOrderInput,
			idempotencyKey?: string,
		): Promise<TOrderDto> => {
			const headers: Record<string, string> = {};
			if (idempotencyKey) {
				headers["Idempotency-Key"] = idempotencyKey;
			}
			return this.fetchApi<TOrderDto>("/api/v1/orders", {
				method: "POST",
				body: input,
				headers,
			});
		},

		updateStatus: (id: string, input: TUpdateStatusInput): Promise<TOrderDto> =>
			this.fetchApi<TOrderDto>(`/api/v1/orders/${id}`, {
				method: "PATCH",
				body: input,
			}),

		getTimeline: (id: string): Promise<readonly TOrderTimelineEntry[]> =>
			this.fetchApi<readonly TOrderTimelineEntry[]>(
				`/api/v1/orders/${id}/timeline`,
			),
	};

	readonly customers = {
		list: (params?: {
			search?: string;
			limit?: number;
			offset?: number;
		}): Promise<{ customers: readonly TCustomerDto[]; total: number }> => {
			const searchParams = new URLSearchParams();
			if (params?.search) searchParams.set("search", params.search);
			searchParams.set("limit", String(params?.limit ?? 50));
			if (params?.offset) searchParams.set("offset", String(params.offset));
			return this.fetchApi<{
				customers: readonly TCustomerDto[];
				total: number;
			}>(`/api/v1/customers?${searchParams.toString()}`);
		},

		get: (id: string): Promise<TCustomerDto | null> =>
			this.fetchApi<TCustomerDto>(`/api/v1/customers/${id}`).catch((err) => {
				if (err instanceof PetsoClientError && err.status === 404) return null;
				throw err;
			}),

		getOrders: (id: string): Promise<readonly TCustomerOrderDto[]> =>
			this.fetchApi<readonly TCustomerOrderDto[]>(
				`/api/v1/customers/${id}/orders`,
			),
	};

	readonly inventory = {
		lowStock: (): Promise<readonly TLowStockItem[]> =>
			this.fetchApi<readonly TLowStockItem[]>("/api/v1/inventory/low-stock"),
	};

	readonly dashboard = {
		summary: (): Promise<TDashboardSummaryDto> =>
			this.fetchApi<TDashboardSummaryDto>("/api/v1/dashboard/summary"),
	};

	readonly webhooks = {
		list: (): Promise<readonly TWebhookEndpoint[]> =>
			this.fetchApi<readonly TWebhookEndpoint[]>("/api/v1/webhooks"),

		create: (input: {
			url: string;
			events: readonly string[];
		}): Promise<TWebhookEndpoint> =>
			this.fetchApi<TWebhookEndpoint>("/api/v1/webhooks", {
				method: "POST",
				body: input,
			}),

		delete: (id: string): Promise<void> =>
			this.fetchApi<void>(`/api/v1/webhooks/${id}`, { method: "DELETE" }),
	};
}
