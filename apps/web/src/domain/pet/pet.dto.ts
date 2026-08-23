import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TTenantId } from "@/shared/types/common.types";
import type { TPet, TPetGender, TPetId, TPetSpecies } from "./pet.types";

export type TPetDto = {
	readonly id: string;
	readonly business_id: string;
	readonly customer_id: string | null;
	readonly name: string;
	readonly species: string;
	readonly breed: string | null;
	readonly gender: string | null;
	readonly birth_date: string | null;
	readonly weight_kg: number | null;
	readonly color: string | null;
	readonly is_vaccinated: boolean;
	readonly vaccine_notes: string | null;
	readonly allergies: string | null;
	readonly medical_notes: string | null;
	readonly special_instructions: string | null;
	readonly photo_url: string | null;
	readonly is_active: boolean;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toPet = (dto: TPetDto): TPet => ({
	id: dto.id as TPetId,
	tenantId: dto.business_id as TTenantId,
	customerId: dto.customer_id as TCustomerId | null,
	name: dto.name,
	species: dto.species as TPetSpecies,
	breed: dto.breed,
	gender: dto.gender as TPetGender | null,
	birthDate: dto.birth_date ? new Date(dto.birth_date) : null,
	weightKg: dto.weight_kg,
	color: dto.color,
	isVaccinated: dto.is_vaccinated,
	vaccineNotes: dto.vaccine_notes,
	allergies: dto.allergies,
	medicalNotes: dto.medical_notes,
	specialInstructions: dto.special_instructions,
	photoUrl: dto.photo_url,
	isActive: dto.is_active,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});
