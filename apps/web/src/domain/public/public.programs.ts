import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { IPublicRepository } from "./public.repository";
import type {
	TPublicBranch,
	TPublicBusiness,
	TPublicProduct,
	TPublicRoom,
} from "./public.types";

export const getPublicBusinessBySlugProgram = (
	slug: string,
): Effect.Effect<TPublicBusiness | null, DatabaseError, IPublicRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPublicRepository;
		return yield* repo.getBusinessBySlug(slug);
	});

export const getPublicBranchesProgram = (
	businessId: string,
): Effect.Effect<readonly TPublicBranch[], DatabaseError, IPublicRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPublicRepository;
		return yield* repo.getBranches(businessId);
	});

export const getPublicRoomsProgram = (
	businessId: string,
): Effect.Effect<readonly TPublicRoom[], DatabaseError, IPublicRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPublicRepository;
		return yield* repo.getRooms(businessId);
	});

export const getPublicProductProgram = (
	businessId: string,
	productId: string,
): Effect.Effect<TPublicProduct | null, DatabaseError, IPublicRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPublicRepository;
		return yield* repo.getProduct(businessId, productId);
	});

export const getPublicFeaturedProductsProgram = (
	businessId: string,
): Effect.Effect<readonly TPublicProduct[], DatabaseError, IPublicRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPublicRepository;
		return yield* repo.getFeaturedProducts(businessId);
	});
