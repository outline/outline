export interface TBoardingPetDto {
	readonly id: string;
	readonly name: string;
	readonly kind: string;
	readonly breed: string;
	readonly vaccinated: "yes" | "no";
	readonly weight: string | null;
	readonly healthStatus: string;
	readonly initialCondition: string | null;
	readonly notes: string | null;
	readonly createdAt: string;
}

export interface TBoardingDto {
	readonly id: string;
	readonly branchId: string;
	readonly customerId: string | null;
	readonly ownerName: string;
	readonly ownerAddress: string;
	readonly ownerPhone: string;
	readonly emergencyContactName: string | null;
	readonly emergencyContactPhone: string | null;
	readonly checkInDate: string;
	readonly estimatedCheckOutDate: string | null;
	readonly notes: string | null;
	readonly status: string;
	readonly roomId: string | null;
	readonly dailyRate: number;
	readonly actualCheckout: string | null;
	readonly totalAmount: number;
	readonly consentAcceptedAt: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly pets: readonly TBoardingPetDto[];
}
