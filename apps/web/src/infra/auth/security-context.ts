import { Effect } from "effect";
import type {
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import { ROLE_CAPABILITIES, type TCapability } from "./capability-matrix";

export type { TCapability } from "./capability-matrix";

export type TSecurityContext = {
	readonly userId: TUserId;
	readonly tenantId: TTenantId;
	readonly role: TUserRole;
	readonly requestId: string;
};

export const hasCapability = (
	role: TUserRole,
	capability: TCapability,
): boolean => {
	const caps = ROLE_CAPABILITIES[role];
	return caps ? caps.includes(capability) : false;
};

export const requireCapability = (
	context: TSecurityContext,
	capability: TCapability,
): Effect.Effect<void, UnauthorizedError> => {
	if (hasCapability(context.role, capability)) {
		return Effect.void;
	}
	return Effect.fail(
		new UnauthorizedError({
			userId: context.userId,
			capability,
			role: context.role,
		}),
	);
};

export class UnauthorizedError extends Error {
	readonly _tag = "UnauthorizedError";
	readonly userId: TUserId;
	readonly capability: TCapability;
	readonly role: TUserRole;

	constructor(opts: {
		readonly userId: TUserId;
		readonly capability: TCapability;
		readonly role: TUserRole;
	}) {
		super(
			`Unauthorized: user ${opts.userId} with role ${opts.role} cannot perform ${opts.capability}`,
		);
		this.userId = opts.userId;
		this.capability = opts.capability;
		this.role = opts.role;
	}
}
