import type { TTenantId, TUserId } from "@/shared/types/common.types";
import type { TApiKeyCreate, TApiKeyScope } from "./api-key.types";

export const generateApiKey = (): string => {
	const random = crypto.randomUUID().replace(/-/g, "");
	return `psk_${random}`;
};

export const buildApiKeyEntity = (
	businessId: TTenantId,
	name: string,
	scopes: readonly TApiKeyScope[],
	creatorId: TUserId,
	expiresAt: string | null,
): { readonly key: string; readonly entity: TApiKeyCreate } => {
	const key = generateApiKey();
	return {
		key,
		entity: {
			businessId,
			name,
			scopes,
			creatorId,
			expiresAt,
			plainTextKey: key,
		},
	};
};
