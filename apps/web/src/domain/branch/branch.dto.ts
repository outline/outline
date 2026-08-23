import type { TBranch, TOperatingHours } from "./branch.types";

export type TBranchDto = {
	readonly id: string;
	readonly name: string;
	readonly address: string | null;
	readonly phone: string | null;
	readonly isActive: boolean;
	readonly email: string | null;
	readonly whatsappNumber: string | null;
	readonly streetAddress: string | null;
	readonly addressLocality: string | null;
	readonly addressRegion: string | null;
	readonly postalCode: string | null;
	readonly addressCountry: string | null;
	readonly latitude: number | null;
	readonly longitude: number | null;
	readonly operatingHours: TOperatingHours | null;
	readonly createdAt: string;
};

export const toBranchDto = (branch: TBranch): TBranchDto => ({
	id: branch.id,
	name: branch.name,
	address: branch.address,
	phone: branch.phone,
	isActive: branch.isActive,
	email: branch.email,
	whatsappNumber: branch.whatsappNumber,
	streetAddress: branch.streetAddress,
	addressLocality: branch.addressLocality,
	addressRegion: branch.addressRegion,
	postalCode: branch.postalCode,
	addressCountry: branch.addressCountry,
	latitude: branch.latitude,
	longitude: branch.longitude,
	operatingHours: branch.operatingHours,
	createdAt: branch.createdAt.toISOString(),
});
