export interface TCreateBoardingInput {
	readonly branchId: string;
	readonly customerId?: string | null;
	readonly ownerName: string;
	readonly ownerAddress: string;
	readonly ownerPhone: string;
	readonly emergencyContactName?: string | null;
	readonly emergencyContactPhone?: string | null;
	readonly checkInDate: string;
	readonly estimatedCheckOutDate: string | null;
	readonly notes?: string | null;
	readonly status?: "draft" | "active";
	readonly ownerSignature?: string | null;
	readonly roomId?: string | null;
	readonly dailyRate?: number;
	readonly pets: readonly {
		readonly name: string;
		readonly kind: "cat" | "dog" | "rabbit" | "other";
		readonly breed: string;
		readonly vaccinated: "yes" | "no";
		readonly weight: string | null;
		readonly healthStatus: string;
		readonly initialCondition?: string | null;
		readonly notes?: string | null;
	}[];
}
