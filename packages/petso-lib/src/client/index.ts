import type {
	TApiResponse,
	TAdminProductInput,
	TAuthCredentials,
	TAuthResult,
	TAdjustStockInput,
	TBranchContactDto,
	TBranchDto,
	TBranchInput,
	TCreateOrderInput,
	TCreateCustomerInput,
	TCustomerDto,
	TCustomerRecordDto,
	TUpdateCustomerInput,
	TCustomerOrderDto,
	TDashboardSummaryDto,
	TLowStockItem,
	TOrderDto,
	TOrderListParams,
	TOrderListResult,
	TOrderTimelineEntry,
	TPurchaseOrderDto,
	TCreatePurchaseOrderInput,
	TReceivePurchaseOrderInput,
	TProductDto,
	TProductListParams,
	TProductListResult,
	TProductSuggestResult,
	TPetDto,
	TCreatePetInput,
	TUpdatePetInput,
	TServiceDto,
	TSessionDto,
	TSupplierDto,
	TSupplierInput,
	TWarehouseDto,
	TWarehouseInput,
	TSignupInput,
	TSignupResult,
	TUpdateStatusInput,
	TStaffMemberDto,
	TStaffAttendanceDto,
	TCreateReturnInput,
	TBoardingDto,
	TCreateBoardingInput,
	TGroomingAppointmentDto,
	TDocumentTemplateDto,
	TSaveDocumentTemplateInput,
	TTopSellerDto,
	TBranchHolidayDto,
	TCreateBranchHolidayInput,
	TCreateExpenseInput,
	TExpenseDto,
	TAccountingDashboardMetricsDto,
	TAccountDto,
	TJournalEntryDto,
	TCashFlowReportDto,
	TCommissionReportDto,
	TLoyaltyConfigDto,
	TUpdateLoyaltyConfigInput,
	TLoyaltyMovementDto,
	TCreatePortalServiceInput,
	TPortalAdminDto,
	TPortalServiceDto,
	TRoomDto,
	TCreateRoomInput,
	TUpdateRoomInput,
	TCreateInvoiceInput,
	TInvoiceDto,
	TRecordInvoicePaymentInput,
	TInventorySnapshot,
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
		createProduct: (input: TAdminProductInput): Promise<TProductDto> =>
			this.fetchApi<TProductDto>("/api/v1/admin/products", {
				method: "POST",
				body: input,
			}),
		updateProduct: (input: TAdminProductInput): Promise<TProductDto> =>
			this.fetchApi<TProductDto>(`/api/v1/admin/products/${input.id}`, {
				method: "PATCH",
				body: input,
			}),
		deleteProduct: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/products/${id}`,
				{ method: "DELETE" },
			),
		inventory: (): Promise<TInventorySnapshot> =>
			this.fetchApi<TInventorySnapshot>("/api/v1/admin/inventory"),
		adjustStock: (
			input: TAdjustStockInput,
		): Promise<{ readonly adjusted: boolean }> =>
			this.fetchApi<{ readonly adjusted: boolean }>(
				"/api/v1/admin/inventory/adjust",
				{ method: "POST", body: input },
			),
		suppliers: (): Promise<readonly TSupplierDto[]> =>
			this.fetchApi<readonly TSupplierDto[]>("/api/v1/admin/suppliers"),
		warehouses: (): Promise<readonly TWarehouseDto[]> =>
			this.fetchApi<readonly TWarehouseDto[]>("/api/v1/admin/warehouses"),
		createSupplier: (input: TSupplierInput): Promise<TSupplierDto> =>
			this.fetchApi<TSupplierDto>("/api/v1/admin/suppliers", {
				method: "POST",
				body: input,
			}),
		updateSupplier: (input: TSupplierInput & { readonly id: string }): Promise<TSupplierDto> =>
			this.fetchApi<TSupplierDto>(`/api/v1/admin/suppliers/${input.id}`, {
				method: "PATCH",
				body: input,
			}),
		deleteSupplier: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/suppliers/${id}`,
				{ method: "DELETE" },
			),
		createWarehouse: (input: TWarehouseInput): Promise<TWarehouseDto> =>
			this.fetchApi<TWarehouseDto>("/api/v1/admin/warehouses", {
				method: "POST",
				body: input,
			}),
		updateWarehouse: (input: TWarehouseInput & { readonly id: string }): Promise<TWarehouseDto> =>
			this.fetchApi<TWarehouseDto>(`/api/v1/admin/warehouses/${input.id}`, {
				method: "PATCH",
				body: input,
			}),
		deleteWarehouse: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/warehouses/${id}`,
				{ method: "DELETE" },
			),
		purchaseOrders: (): Promise<readonly TPurchaseOrderDto[]> =>
			this.fetchApi<readonly TPurchaseOrderDto[]>(
				"/api/v1/admin/purchase-orders",
			),
		rooms: (branchId?: string): Promise<readonly TRoomDto[]> =>
			this.fetchApi<readonly TRoomDto[]>(
				`/api/v1/admin/rooms${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`,
			),
		createRoom: (input: TCreateRoomInput): Promise<TRoomDto> =>
			this.fetchApi<TRoomDto>("/api/v1/admin/rooms", {
				method: "POST",
				body: input,
			}),
		updateRoom: (input: TUpdateRoomInput): Promise<TRoomDto> =>
			this.fetchApi<TRoomDto>(`/api/v1/admin/rooms/${input.id}`, {
				method: "PATCH",
				body: input,
			}),
		deleteRoom: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/rooms/${id}`,
				{ method: "DELETE" },
			),
		invoices: (): Promise<readonly TInvoiceDto[]> =>
			this.fetchApi<readonly TInvoiceDto[]>("/api/v1/admin/invoices"),
		createInvoice: (input: TCreateInvoiceInput): Promise<TInvoiceDto> =>
			this.fetchApi<TInvoiceDto>("/api/v1/admin/invoices", {
				method: "POST",
				body: input,
			}),
		recordInvoicePayment: (
			input: TRecordInvoicePaymentInput,
		): Promise<TInvoiceDto> =>
			this.fetchApi<TInvoiceDto>(
				`/api/v1/admin/invoices/${input.invoiceId}/payment`,
				{ method: "POST", body: input },
			),
		voidInvoice: (id: string): Promise<{ readonly voided: boolean }> =>
			this.fetchApi<{ readonly voided: boolean }>(
				`/api/v1/admin/invoices/${id}/void`,
				{ method: "POST" },
			),
		createPurchaseOrder: (
			input: TCreatePurchaseOrderInput,
		): Promise<TPurchaseOrderDto> =>
			this.fetchApi<TPurchaseOrderDto>("/api/v1/admin/purchase-orders", {
				method: "POST",
				body: input,
			}),
		updatePurchaseOrderStatus: (
			id: string,
			status: string,
		): Promise<{ readonly updated: boolean }> =>
			this.fetchApi<{ readonly updated: boolean }>(
			`/api/v1/admin/purchase-orders/${id}/status`,
			{ method: "PATCH", body: { status } },
			),
		receivePurchaseOrder: (
			input: TReceivePurchaseOrderInput,
		): Promise<Record<string, unknown>> =>
			this.fetchApi<Record<string, unknown>>(
				"/api/v1/admin/purchase-orders/receive",
				{ method: "POST", body: input },
			),
		orders: (): Promise<readonly TOrderDto[]> =>
			this.fetchApi<readonly TOrderDto[]>("/api/v1/admin/orders"),
		createOrder: (input: TCreateOrderInput): Promise<TOrderDto> =>
			this.fetchApi<TOrderDto>("/api/v1/admin/orders", {
				method: "POST",
				body: input,
			}),
		voidOrder: (
			id: string,
			reason: string,
		): Promise<{ readonly voided: boolean }> =>
			this.fetchApi<{ readonly voided: boolean }>(
				`/api/v1/admin/orders/${id}/void`,
				{ method: "POST", body: { reason } },
			),
		customers: (): Promise<readonly TCustomerRecordDto[]> =>
			this.fetchApi<readonly TCustomerRecordDto[]>("/api/v1/admin/customers"),
		pets: (): Promise<readonly TPetDto[]> =>
			this.fetchApi<readonly TPetDto[]>("/api/v1/admin/pets"),
		staff: (): Promise<readonly TStaffMemberDto[]> =>
			this.fetchApi<readonly TStaffMemberDto[]>("/api/v1/admin/staff"),
		removeStaff: (
			userId: string,
			branchId: string,
		): Promise<{ readonly removed: boolean }> =>
			this.fetchApi<{ readonly removed: boolean }>(
				`/api/v1/admin/staff/${userId}`,
				{ method: "DELETE", body: { branchId } },
			),
		clockIn: (
			input: { readonly staffId: string; readonly date: string; readonly notes?: string | null },
		): Promise<TStaffAttendanceDto> =>
			this.fetchApi<TStaffAttendanceDto>("/api/v1/admin/shifts/clock-in", {
				method: "POST",
				body: input,
			}),
		clockOut: (
			input: { readonly staffId: string; readonly date: string; readonly notes?: string | null },
		): Promise<TStaffAttendanceDto> =>
			this.fetchApi<TStaffAttendanceDto>("/api/v1/admin/shifts/clock-out", {
				method: "POST",
				body: input,
			}),
		returns: (): Promise<readonly Record<string, unknown>[]> =>
			this.fetchApi<readonly Record<string, unknown>[]>("/api/v1/admin/returns"),
		createReturn: (
			input: TCreateReturnInput,
		): Promise<{ readonly created: boolean; readonly id: string }> =>
			this.fetchApi<{ readonly created: boolean; readonly id: string }>(
				"/api/v1/admin/returns",
				{ method: "POST", body: input },
			),
		boardings: (): Promise<readonly TBoardingDto[]> =>
			this.fetchApi<readonly TBoardingDto[]>("/api/v1/admin/boardings"),
		updateBoardingStatus: (
			id: string,
			status: "draft" | "active" | "completed",
		): Promise<{ readonly updated: boolean }> =>
			this.fetchApi<{ readonly updated: boolean }>(
				`/api/v1/admin/boardings/${id}/status`,
				{ method: "PATCH", body: { status } },
			),
		createBoarding: (
			input: TCreateBoardingInput,
		): Promise<TBoardingDto> =>
			this.fetchApi<TBoardingDto>("/api/v1/admin/boardings", {
				method: "POST",
				body: input,
			}),
		groomingAppointments: (): Promise<readonly TGroomingAppointmentDto[]> =>
			this.fetchApi<readonly TGroomingAppointmentDto[]>(
				"/api/v1/admin/grooming/appointments",
			),
		updateGroomingStatus: (
			id: string,
			status: TGroomingAppointmentDto["status"],
		): Promise<TGroomingAppointmentDto> =>
			this.fetchApi<TGroomingAppointmentDto>(
				`/api/v1/admin/grooming/appointments/${id}/status`,
				{ method: "PATCH", body: { status } },
			),
		documentTemplates: (): Promise<readonly TDocumentTemplateDto[]> =>
				this.fetchApi<readonly TDocumentTemplateDto[]>(
					"/api/v1/admin/document-templates",
				),
		saveDocumentTemplate: (
			input: TSaveDocumentTemplateInput,
		): Promise<TDocumentTemplateDto> =>
			this.fetchApi<TDocumentTemplateDto>(
				"/api/v1/admin/document-templates",
				{ method: "POST", body: input },
			),
		topSellers: (): Promise<readonly TTopSellerDto[]> =>
				this.fetchApi<readonly TTopSellerDto[]>(
					"/api/v1/admin/dashboard/top-sellers",
				),
		portal: (): Promise<TPortalAdminDto> =>
			this.fetchApi<TPortalAdminDto>("/api/v1/admin/portal"),
		createPortalService: (
			input: TCreatePortalServiceInput,
		): Promise<TPortalServiceDto> =>
			this.fetchApi<TPortalServiceDto>("/api/v1/admin/portal/services", {
				method: "POST",
				body: input,
			}),
		setPortalServiceActive: (
			id: string,
			isActive: boolean,
		): Promise<{ readonly updated: boolean }> =>
			this.fetchApi<{ readonly updated: boolean }>(
				`/api/v1/admin/portal/services/${id}/status`,
				{ method: "PATCH", body: { isActive } },
			),
		deletePortalService: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/portal/services/${id}`,
				{ method: "DELETE" },
			),
		updatePortalSettings: (
			input: Record<string, unknown>,
		): Promise<{ readonly updated: boolean }> =>
			this.fetchApi<{ readonly updated: boolean }>("/api/v1/admin/portal/config", {
				method: "PATCH",
				body: input,
			}),
		branchHolidays: (): Promise<readonly TBranchHolidayDto[]> =>
			this.fetchApi<readonly TBranchHolidayDto[]>(
				"/api/v1/admin/branch-holidays",
			),
		createBranchHoliday: (
			input: TCreateBranchHolidayInput,
		): Promise<TBranchHolidayDto> =>
			this.fetchApi<TBranchHolidayDto>("/api/v1/admin/branch-holidays", {
				method: "POST",
				body: input,
			}),
		deleteBranchHoliday: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/branch-holidays/${id}`,
				{ method: "DELETE" },
			),
		expenses: (): Promise<readonly TExpenseDto[]> =>
			this.fetchApi<readonly TExpenseDto[]>("/api/v1/admin/expenses"),
		createExpense: (input: TCreateExpenseInput): Promise<TExpenseDto> =>
			this.fetchApi<TExpenseDto>("/api/v1/admin/expenses", {
				method: "POST",
				body: input,
			}),
		accountingDashboardMetrics: (): Promise<TAccountingDashboardMetricsDto> =>
			this.fetchApi<TAccountingDashboardMetricsDto>(
				"/api/v1/admin/accounting/dashboard-metrics",
			),
		accounts: (): Promise<readonly TAccountDto[]> =>
			this.fetchApi<readonly TAccountDto[]>("/api/v1/admin/accounting/accounts"),
		journal: (): Promise<readonly TJournalEntryDto[]> =>
			this.fetchApi<readonly TJournalEntryDto[]>("/api/v1/admin/accounting/journal"),
		cashFlow: (): Promise<TCashFlowReportDto> =>
			this.fetchApi<TCashFlowReportDto>("/api/v1/admin/accounting/cash-flow"),
		commissions: (): Promise<readonly TCommissionReportDto[]> =>
			this.fetchApi<readonly TCommissionReportDto[]>(
				"/api/v1/admin/accounting/commissions",
			),
		loyaltyConfig: (): Promise<TLoyaltyConfigDto> =>
			this.fetchApi<TLoyaltyConfigDto>("/api/v1/admin/loyalty/config"),
		loyaltyMovements: (): Promise<readonly TLoyaltyMovementDto[]> =>
			this.fetchApi<readonly TLoyaltyMovementDto[]>(
				"/api/v1/admin/loyalty/movements",
			),
		updateLoyaltyConfig: (
			input: TUpdateLoyaltyConfigInput,
		): Promise<{ readonly updated: boolean }> =>
			this.fetchApi<{ readonly updated: boolean }>(
				"/api/v1/admin/loyalty/config",
				{ method: "PATCH", body: input },
			),
		redeemLoyaltyPoints: (
			input: { readonly customerId: string; readonly points: number },
		): Promise<{ readonly pointsRedeemed: number; readonly newTotal: number }> =>
			this.fetchApi<{ readonly pointsRedeemed: number; readonly newTotal: number }>(
				"/api/v1/admin/loyalty/redeem",
				{ method: "POST", body: input },
			),
		createCustomer: (input: TCreateCustomerInput): Promise<TCustomerRecordDto> =>
			this.fetchApi<TCustomerRecordDto>("/api/v1/admin/customers", {
				method: "POST",
				body: input,
			}),
		updateCustomer: (
			input: TUpdateCustomerInput,
		): Promise<TCustomerRecordDto> =>
			this.fetchApi<TCustomerRecordDto>(
				`/api/v1/admin/customers/${input.id}`,
				{ method: "PATCH", body: input },
			),
		deleteCustomer: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/customers/${id}`,
				{ method: "DELETE" },
			),
		createPet: (input: TCreatePetInput): Promise<TPetDto> =>
			this.fetchApi<TPetDto>("/api/v1/admin/pets", {
				method: "POST",
				body: input,
			}),
		updatePet: (input: TUpdatePetInput): Promise<TPetDto> =>
			this.fetchApi<TPetDto>(`/api/v1/admin/pets/${input.id}`, {
				method: "PATCH",
				body: input,
			}),
		deletePet: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/pets/${id}`,
				{ method: "DELETE" },
			),
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
		create: (input: TBranchInput): Promise<TBranchDto> =>
			this.fetchApi<TBranchDto>("/api/v1/admin/branches", {
				method: "POST",
				body: input,
			}),
		update: (input: TBranchInput & { readonly id: string }): Promise<TBranchDto> =>
			this.fetchApi<TBranchDto>(`/api/v1/admin/branches/${input.id}`, {
				method: "PATCH",
				body: input,
			}),
		remove: (id: string): Promise<{ readonly deleted: boolean }> =>
			this.fetchApi<{ readonly deleted: boolean }>(
				`/api/v1/admin/branches/${id}`,
				{ method: "DELETE" },
			),
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
