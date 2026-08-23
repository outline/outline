import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TBoarding,
	TBoardingCharge,
	TBoardingDailyPhoto,
	TBoardingId,
	TBoardingWithPets,
} from "./boarding.types";

export class IBoardingRepository extends Context.Tag("IBoardingRepository")<
	IBoardingRepository,
	{
		readonly findById: (
			id: TBoardingId,
			tenantId: TTenantId,
		) => Effect.Effect<TBoardingWithPets | null, DatabaseError>;
		readonly findAll: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TBoardingWithPets[], DatabaseError>;
		readonly saveFull: (
			boardingWithPets: TBoardingWithPets,
		) => Effect.Effect<void, DatabaseError>;
		readonly update: (
			boarding: TBoarding,
		) => Effect.Effect<void, DatabaseError>;
		readonly updateFull: (
			boardingWithPets: TBoardingWithPets,
		) => Effect.Effect<void, DatabaseError>;
		readonly delete: (
			id: TBoardingId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly getCharges: (
			boardingId: TBoardingId,
			tenantId: TTenantId,
		) => Effect.Effect<readonly TBoardingCharge[], DatabaseError>;
		readonly addCharge: (
			charge: TBoardingCharge,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly getPhotos: (
			boardingId: TBoardingId,
			tenantId: TTenantId,
		) => Effect.Effect<readonly TBoardingDailyPhoto[], DatabaseError>;
		readonly addPhoto: (
			photo: TBoardingDailyPhoto,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
