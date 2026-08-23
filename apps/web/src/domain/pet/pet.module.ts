import { Effect } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TTenantId } from "@/shared/types/common.types";
import type { CreatePetSchema, UpdatePetSchema } from "./pet.schemas";
import type { TPet } from "./pet.types";

export const createPet = (
	tenantId: TTenantId,
	data: typeof CreatePetSchema.Type,
) =>
	Effect.sync(() => {
		const pet: Omit<TPet, "id" | "createdAt" | "updatedAt"> = {
			tenantId,
			customerId: data.customerId as TCustomerId,
			name: data.name,
			species: data.species,
			breed: data.breed,
			gender: data.gender,
			birthDate: data.birthDate,
			weightKg: data.weightKg,
			color: data.color,
			isVaccinated: data.isVaccinated,
			vaccineNotes: data.vaccineNotes,
			allergies: data.allergies,
			medicalNotes: data.medicalNotes,
			specialInstructions: data.specialInstructions,
			photoUrl: data.photoUrl,
			isActive: true,
		};
		return pet;
	});

export const updatePetData = (data: typeof UpdatePetSchema.Type) =>
	Effect.sync(() => {
		const updates: Partial<
			Omit<TPet, "id" | "tenantId" | "createdAt" | "updatedAt">
		> = {
			...(data.customerId !== undefined && {
				customerId: data.customerId as TCustomerId,
			}),
			...(data.name !== undefined && { name: data.name }),
			...(data.species !== undefined && { species: data.species }),
			...(data.breed !== undefined && { breed: data.breed }),
			...(data.gender !== undefined && { gender: data.gender }),
			...(data.birthDate !== undefined && { birthDate: data.birthDate }),
			...(data.weightKg !== undefined && { weightKg: data.weightKg }),
			...(data.color !== undefined && { color: data.color }),
			...(data.isVaccinated !== undefined && {
				isVaccinated: data.isVaccinated,
			}),
			...(data.vaccineNotes !== undefined && {
				vaccineNotes: data.vaccineNotes,
			}),
			...(data.allergies !== undefined && { allergies: data.allergies }),
			...(data.medicalNotes !== undefined && {
				medicalNotes: data.medicalNotes,
			}),
			...(data.specialInstructions !== undefined && {
				specialInstructions: data.specialInstructions,
			}),
			...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
			...(data.isActive !== undefined && { isActive: data.isActive }),
		};

		return updates;
	});
