import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TId, TTenantId } from "@/shared/types/common.types";

export type TPetId = TId & { readonly _brand: "PetId" };

export const PET_SPECIES = [
	"dog",
	"cat",
	"rabbit",
	"bird",
	"hamster",
	"other",
] as const;
export type TPetSpecies = (typeof PET_SPECIES)[number];

export const PET_GENDER = ["male", "female", "unknown"] as const;
export type TPetGender = (typeof PET_GENDER)[number];

export type TPet = {
	readonly id: TPetId;
	readonly tenantId: TTenantId;
	readonly customerId: TCustomerId | null;
	readonly name: string;
	readonly species: TPetSpecies;
	readonly breed: string | null;
	readonly gender: TPetGender | null;
	readonly birthDate: Date | null;
	readonly weightKg: number | null;
	readonly color: string | null;
	readonly isVaccinated: boolean;
	readonly vaccineNotes: string | null;
	readonly allergies: string | null;
	readonly medicalNotes: string | null;
	readonly specialInstructions: string | null;
	readonly photoUrl: string | null;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};
