import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TPublicBranch,
	TPublicBusiness,
	TPublicProduct,
	TPublicRoom,
} from "./public.types";

export class IPublicRepository extends Context.Tag("IPublicRepository")<
	IPublicRepository,
	{
		readonly getBusinessBySlug: (
			slug: string,
		) => Effect.Effect<TPublicBusiness | null, DatabaseError>;

		readonly getBranches: (
			businessId: string,
		) => Effect.Effect<readonly TPublicBranch[], DatabaseError>;

		readonly getRooms: (
			businessId: string,
			targetDate?: Date,
		) => Effect.Effect<readonly TPublicRoom[], DatabaseError>;

		readonly getProduct: (
			businessId: string,
			productId: string,
		) => Effect.Effect<TPublicProduct | null, DatabaseError>;

		readonly getFeaturedProducts: (
			businessId: string,
		) => Effect.Effect<readonly TPublicProduct[], DatabaseError>;
	}
>() {}
