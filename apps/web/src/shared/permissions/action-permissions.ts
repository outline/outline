import type { TCapability } from "@/infra/auth/capability-matrix";
import { ROLE_CAPABILITIES } from "@/infra/auth/capability-matrix";
import type { TUserRole } from "@/shared/types/common.types";

/**
 * FE-only action gating helpers.
 *
 * The capability matrix in `@/infra/auth/capability-matrix` is the
 * single source of truth shared between server (`requireCapability` in
 * `security-context`) and FE. This module re-exports the matrix and
 * exposes ergonomics for UI use:
 *
 *   const { can } = useActionPermissions();
 *   <Button disabled={!can("product:write")}>...</Button>
 *
 * Server-side `requireCapability` in `security-context.ts` remains the
 * authoritative authorization gate. FE gating is purely a UX
 * affordance — disabled buttons must never be relied on as a security
 * boundary.
 */

export type { TCapability };

export const ROLE_CAPABILITIES_CLIENT = ROLE_CAPABILITIES;

export const roleHasCapability = (
	role: TUserRole | null | undefined,
	capability: TCapability,
): boolean => {
	if (!role) return false;
	return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
};

export type TActionPermissions = {
	readonly can: (capability: TCapability) => boolean;
	readonly canAny: (capabilities: readonly TCapability[]) => boolean;
	readonly canAll: (capabilities: readonly TCapability[]) => boolean;
};

export const buildActionPermissions = (
	role: TUserRole | null | undefined,
): TActionPermissions => {
	const capabilitySet = role
		? new Set<TCapability>(ROLE_CAPABILITIES[role] ?? [])
		: new Set<TCapability>();

	return {
		can: (capability) => capabilitySet.has(capability),
		canAny: (capabilities) => capabilities.some((c) => capabilitySet.has(c)),
		canAll: (capabilities) => capabilities.every((c) => capabilitySet.has(c)),
	};
};
