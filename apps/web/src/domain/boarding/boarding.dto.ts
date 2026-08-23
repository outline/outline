import type { TBoarding, TBoardingWithPets, TPet } from "./boarding.types";

export type TPetDto = {
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
};

export type TBoardingDto = {
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
};

export type TBoardingWithPetsDto = TBoardingDto & {
	readonly pets: readonly TPetDto[];
};

export const toPetDto = (pet: TPet): TPetDto => ({
	id: pet.id,
	name: pet.name,
	kind: pet.kind,
	breed: pet.breed,
	vaccinated: pet.vaccinated,
	weight: pet.weight,
	healthStatus: pet.healthStatus,
	initialCondition: pet.initialCondition,
	notes: pet.notes,
	createdAt: pet.createdAt.toISOString(),
});

export const toBoardingDto = (boarding: TBoarding): TBoardingDto => ({
	id: boarding.id,
	branchId: boarding.branchId,
	customerId: boarding.customerId,
	ownerName: boarding.ownerName,
	ownerAddress: boarding.ownerAddress,
	ownerPhone: boarding.ownerPhone,
	emergencyContactName: boarding.emergencyContactName,
	emergencyContactPhone: boarding.emergencyContactPhone,
	checkInDate: boarding.checkInDate.toISOString(),
	estimatedCheckOutDate: boarding.estimatedCheckOutDate
		? boarding.estimatedCheckOutDate.toISOString()
		: null,
	notes: boarding.notes,
	status: boarding.status,
	roomId: boarding.roomId,
	dailyRate: boarding.dailyRate,
	actualCheckout: boarding.actualCheckout
		? boarding.actualCheckout.toISOString()
		: null,
	totalAmount: boarding.totalAmount,
	consentAcceptedAt: boarding.consentAcceptedAt
		? boarding.consentAcceptedAt.toISOString()
		: null,
	createdAt: boarding.createdAt.toISOString(),
	updatedAt: boarding.updatedAt.toISOString(),
});

export const toBoardingWithPetsDto = (
	boarding: TBoardingWithPets,
): TBoardingWithPetsDto => ({
	...toBoardingDto(boarding),
	pets: boarding.pets.map(toPetDto),
});
