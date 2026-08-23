export interface TPortalServiceDto {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly durationMinutes: number;
	readonly price: number;
	readonly isActive: boolean;
	readonly category: string | null;
}

export interface TPortalConfigDto {
	readonly slug: string;
	readonly isActive: boolean;
	readonly bookingEnabled: boolean;
}

export interface TPortalStatsDto {
	readonly totalReviews: number;
	readonly averageRating: number;
	readonly totalServices: number;
	readonly totalPets: number;
}

export interface TPortalReviewDto {
	readonly id: string;
	readonly customerName: string;
	readonly rating: number;
	readonly content: string;
	readonly createdAt: string;
}

export interface TPortalAdminDto {
	readonly config: TPortalConfigDto;
	readonly services: readonly TPortalServiceDto[];
	readonly stats: TPortalStatsDto;
	readonly reviews: readonly TPortalReviewDto[];
}

export interface TCreatePortalServiceInput {
	readonly name: string;
	readonly description: string;
	readonly category: string;
	readonly durationMinutes: number;
	readonly price: number;
}
