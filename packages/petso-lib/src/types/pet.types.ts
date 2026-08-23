export interface TPetDto {
	readonly id: string;
	readonly tenantId: string;
	readonly customerId: string | null;
	readonly name: string;
	readonly species: string;
	readonly breed: string | null;
	readonly gender: string | null;
	readonly birthDate: string | null;
	readonly weightKg: number | null;
	readonly color: string | null;
	readonly isVaccinated: boolean;
	readonly vaccineNotes: string | null;
	readonly allergies: string | null;
	readonly medicalNotes: string | null;
	readonly specialInstructions: string | null;
	readonly photoUrl: string | null;
	readonly isActive: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}
