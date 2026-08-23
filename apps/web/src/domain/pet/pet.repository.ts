import { Context, type Effect } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { PetNotFoundError } from "./pet.errors";
import type { TPet, TPetId } from "./pet.types";

export interface IPetRepository {
	readonly findById: (
		id: TPetId,
		tenantId: TTenantId,
	) => Effect.Effect<TPet, DatabaseError | PetNotFoundError>;

	readonly findByCustomerId: (
		customerId: TCustomerId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TPet[], DatabaseError>;

	readonly findAllActive: (
		tenantId: TTenantId,
	) => Effect.Effect<readonly TPet[], DatabaseError>;

	readonly save: (
		pet: Omit<TPet, "id" | "createdAt" | "updatedAt">,
	) => Effect.Effect<TPet, DatabaseError>;

	readonly update: (
		id: TPetId,
		tenantId: TTenantId,
		pet: Partial<Omit<TPet, "id" | "tenantId" | "createdAt" | "updatedAt">>,
	) => Effect.Effect<TPet, DatabaseError | PetNotFoundError>;

	readonly delete: (
		id: TPetId,
		tenantId: TTenantId,
	) => Effect.Effect<void, DatabaseError | PetNotFoundError>;
}

export const PetRepository =
	Context.GenericTag<IPetRepository>("PetRepository");
