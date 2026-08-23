import type { TRoomId } from "@/domain/room/room.types";
import type {
	TBranchId,
	TId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";

export type TBoardingId = TId & { readonly _brand: "BoardingId" };
export type TPetId = TId & { readonly _brand: "PetId" };
export type TBoardingChargeId = TId & { readonly _brand: "BoardingChargeId" };
export type TBoardingDailyPhotoId = TId & {
	readonly _brand: "BoardingDailyPhotoId";
};

export const BOARDING_STATUS = {
	DRAFT: "draft",
	ACTIVE: "active",
	COMPLETED: "completed",
} as const;
export type TBoardingStatus =
	(typeof BOARDING_STATUS)[keyof typeof BOARDING_STATUS];

export const PET_KIND = {
	CAT: "cat",
	DOG: "dog",
	RABBIT: "rabbit",
	OTHER: "other",
} as const;
export type TPetKind = (typeof PET_KIND)[keyof typeof PET_KIND];

export type TBoarding = {
	readonly id: TBoardingId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId;
	readonly customerId: string | null;
	readonly ownerName: string;
	readonly ownerAddress: string;
	readonly ownerPhone: string;
	readonly emergencyContactName: string | null;
	readonly emergencyContactPhone: string | null;
	readonly ownerSignature: string | null;
	readonly checkInDate: Date;
	readonly estimatedCheckOutDate: Date | null;
	readonly notes: string | null;
	readonly status: TBoardingStatus;
	readonly roomId: TRoomId | null;
	readonly dailyRate: number;
	readonly actualCheckout: Date | null;
	readonly totalAmount: number;
	readonly consentAcceptedAt: Date | null;
	readonly createdBy: TUserId;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TPet = {
	readonly id: TPetId;
	readonly boardingId: TBoardingId;
	readonly name: string;
	readonly kind: TPetKind;
	readonly breed: string;
	readonly vaccinated: "yes" | "no";
	readonly weight: string | null;
	readonly healthStatus: string;
	readonly initialCondition: string | null;
	readonly notes: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TBoardingWithPets = TBoarding & {
	readonly pets: readonly TPet[];
};

export type TBoardingCharge = {
	readonly id: TBoardingChargeId;
	readonly boardingId: TBoardingId;
	readonly tenantId: TTenantId;
	readonly description: string;
	readonly amount: number;
	readonly chargeDate: Date;
	readonly createdBy: TUserId | null;
};

export type TBoardingDailyPhoto = {
	readonly id: TBoardingDailyPhotoId;
	readonly boardingId: TBoardingId;
	readonly photoUrl: string;
	readonly caption: string | null;
	readonly takenDate: Date;
	readonly uploadedAt: Date;
	readonly uploadedBy: TUserId | null;
};

export type TBoardingProps = Omit<
	TBoarding,
	"id" | "createdAt" | "updatedAt" | "consentAcceptedAt" | "actualCheckout"
>;
export type TPetProps = Omit<
	TPet,
	"id" | "boardingId" | "createdAt" | "updatedAt"
>;
