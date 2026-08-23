import type { TId, TTenantId, TUserId } from "@/shared/types/common.types";

export type TApiKeyScope = "products:read" | "categories:read" | "orders:write";
export const ALL_API_KEY_SCOPES: readonly TApiKeyScope[] = [
	"products:read",
	"categories:read",
	"orders:write",
] as const;

export type TApiKeyId = TId & { readonly _brand: "ApiKeyId" };

export type TApiKey = {
	readonly id: TApiKeyId;
	readonly businessId: TTenantId;
	readonly keyHash: string;
	readonly prefix: string;
	readonly name: string;
	readonly scopes: readonly TApiKeyScope[];
	readonly isActive: boolean;
	readonly creatorId: TUserId | null;
	readonly expiresAt: string | null;
	readonly revokedAt: string | null;
	readonly rotatedFromKeyId: string | null;
	readonly lastUsedAt: string | null;
	readonly createdAt: string;
};

export type TApiKeyCreate = {
	readonly businessId: TTenantId;
	readonly name: string;
	readonly scopes: readonly TApiKeyScope[];
	readonly creatorId: TUserId;
	readonly expiresAt: string | null;
	readonly plainTextKey: string;
};

export type TApiKeyValidation = {
	readonly businessId: TTenantId;
	readonly keyId: TApiKeyId;
	readonly scopes: readonly TApiKeyScope[];
};
