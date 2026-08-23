export type TId = string;

export type TUserId = TId & { readonly _brand: "UserId" };
export type TTenantId = TId & { readonly _brand: "TenantId" };
export type TBranchId = TId & { readonly _brand: "BranchId" };

export type TUserRole = "owner" | "manager" | "kasir" | "staff_daycare";

export type TSessionUser = {
	readonly sessionId: string;
	readonly userId: string;
	readonly tenantId: string;
	readonly role: TUserRole;
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

export type TApiResponse<T = unknown> =
	| {
			readonly success: true;
			readonly data: T;
			readonly meta?: Record<string, unknown>;
	  }
	| {
			readonly success: false;
			readonly error: {
				readonly _tag: string;
				readonly message: string;
				readonly details?: unknown;
			};
			readonly meta?: Record<string, unknown>;
	  };
