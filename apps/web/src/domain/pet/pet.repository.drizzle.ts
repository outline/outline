import { and, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { pets } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { PetNotFoundError } from "./pet.errors";
import { PetRepository } from "./pet.repository";
import type { TPet, TPetGender, TPetId, TPetSpecies } from "./pet.types";

export const PetRepositoryDrizzle = Layer.effect(
	PetRepository,
	Effect.map(IDrizzleClient, (db) =>
		PetRepository.of({
			findById: (id: TPetId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.pets.findFirst({
							where: {
								RAW: (p, { and, eq }) =>
									and(eq(p.id, id), eq(p.businessId, tenantId)),
							},
						});
						if (!row) throw new PetNotFoundError({ id });
						return mapPet(row);
					},
					catch: (e) => {
						if (e instanceof PetNotFoundError) return e;
						return new DatabaseError({ cause: e });
					},
				}),

			findByCustomerId: (customerId: TCustomerId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(pets)
							.where(
								and(
									eq(pets.customerId, customerId),
									eq(pets.businessId, tenantId),
								),
							)
							.orderBy(pets.name);
						return rows.map(mapPet);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findAllActive: (tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(pets)
							.where(
								and(eq(pets.businessId, tenantId), eq(pets.isActive, true)),
							)
							.orderBy(pets.name);
						return rows.map(mapPet);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			save: (input: Omit<TPet, "id" | "createdAt" | "updatedAt">) =>
				Effect.tryPromise({
					try: async () => {
						const now = new Date().toISOString();
						const id = generateId<TPetId>();
						const [row] = await db
							.insert(pets)
							.values({
								id,
								businessId: input.tenantId,
								customerId: input.customerId,
								name: input.name,
								species: input.species,
								breed: input.breed,
								gender: input.gender,
								birthDate: input.birthDate
									? input.birthDate.toISOString().split("T")[0]
									: null,
								weightKg: input.weightKg ? input.weightKg.toString() : null,
								color: input.color,
								isVaccinated: input.isVaccinated,
								vaccineNotes: input.vaccineNotes,
								allergies: input.allergies,
								medicalNotes: input.medicalNotes,
								specialInstructions: input.specialInstructions,
								photoUrl: input.photoUrl,
								isActive: input.isActive,
								createdAt: now,
								updatedAt: now,
							})
							.returning();
						return mapPet(row as typeof pets.$inferSelect);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			update: (
				id: TPetId,
				tenantId: TTenantId,
				input: Partial<
					Omit<TPet, "id" | "tenantId" | "createdAt" | "updatedAt">
				>,
			) =>
				Effect.tryPromise({
					try: async () => {
						const now = new Date().toISOString();
						const updateData: Record<string, unknown> = {
							...input,
							updatedAt: now,
						};

						if (input.birthDate !== undefined) {
							updateData.birthDate = input.birthDate
								? input.birthDate.toISOString().split("T")[0]
								: null;
						}
						if (input.weightKg !== undefined) {
							updateData.weightKg = input.weightKg
								? input.weightKg.toString()
								: null;
						}

						const [row] = await db
							.update(pets)
							.set(updateData)
							.where(and(eq(pets.id, id), eq(pets.businessId, tenantId)))
							.returning();

						if (!row) throw new PetNotFoundError({ id });
						return mapPet(row);
					},
					catch: (e) => {
						if (e instanceof PetNotFoundError) return e;
						return new DatabaseError({ cause: e });
					},
				}),

			delete: (id: TPetId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const [row] = await db
							.delete(pets)
							.where(and(eq(pets.id, id), eq(pets.businessId, tenantId)))
							.returning({ id: pets.id });

						if (!row) throw new PetNotFoundError({ id });
					},
					catch: (e) => {
						if (e instanceof PetNotFoundError) return e;
						return new DatabaseError({ cause: e });
					},
				}),
		}),
	),
);

function mapPet(row: typeof pets.$inferSelect): TPet {
	return {
		id: row.id as TPetId,
		tenantId: row.businessId as TTenantId,
		customerId: row.customerId as TCustomerId | null,
		name: row.name,
		species: row.species as TPetSpecies,
		breed: row.breed,
		gender: row.gender as TPetGender | null,
		birthDate: row.birthDate ? new Date(row.birthDate) : null,
		weightKg: row.weightKg ? Number.parseFloat(row.weightKg) : null,
		color: row.color,
		isVaccinated: row.isVaccinated,
		vaccineNotes: row.vaccineNotes,
		allergies: row.allergies,
		medicalNotes: row.medicalNotes,
		specialInstructions: row.specialInstructions,
		photoUrl: row.photoUrl,
		isActive: row.isActive,
		createdAt: new Date(row.createdAt),
		updatedAt: new Date(row.updatedAt),
	};
}
