import { Effect, Schema } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TTenantId } from "@/shared/types/common.types";
import { createPet, updatePetData } from "./pet.module";
import { PetRepository } from "./pet.repository";
import { CreatePetSchema, UpdatePetSchema } from "./pet.schemas";
import type { TPetId } from "./pet.types";

export const getPetsProgram = (tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(PetRepository);
		return yield* _(repo.findAllActive(tenantId));
	});

export const getPetsByCustomerProgram = (
	tenantId: TTenantId,
	customerId: TCustomerId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(PetRepository);
		return yield* _(repo.findByCustomerId(customerId, tenantId));
	});

export const getPetByIdProgram = (tenantId: TTenantId, id: TPetId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(PetRepository);
		return yield* _(repo.findById(id, tenantId));
	});

export const addPetProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(PetRepository);
		const parsed = yield* _(Schema.decodeUnknown(CreatePetSchema)(data));

		const petEntity = yield* _(createPet(tenantId, parsed));
		return yield* _(repo.save(petEntity));
	});

export const updatePetProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(PetRepository);
		const parsed = yield* _(Schema.decodeUnknown(UpdatePetSchema)(data));

		const updates = yield* _(updatePetData(parsed));
		return yield* _(repo.update(parsed.id as TPetId, tenantId, updates));
	});

export const deletePetProgram = (tenantId: TTenantId, id: TPetId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(PetRepository);
		return yield* _(repo.delete(id, tenantId));
	});
