import { Effect } from "effect";
import { generateId } from "@/shared/utils";
import {
	InvalidCheckOutDateError,
	InvalidStatusTransitionError,
	NoPetsProvidedError,
} from "./boarding.errors";
import type {
	TBoarding,
	TBoardingId,
	TBoardingProps,
	TBoardingStatus,
	TBoardingWithPets,
	TPet,
	TPetId,
	TPetProps,
} from "./boarding.types";

export const BoardingModule = {
	createBoarding: (
		props: TBoardingProps,
	): Effect.Effect<TBoarding, InvalidCheckOutDateError> =>
		Effect.gen(function* () {
			if (
				props.estimatedCheckOutDate !== null &&
				props.estimatedCheckOutDate < props.checkInDate
			) {
				yield* Effect.fail(
					new InvalidCheckOutDateError({
						checkInDate: props.checkInDate,
						estimatedCheckOutDate: props.estimatedCheckOutDate,
					}),
				);
			}
			return {
				...props,
				id: generateId<TBoardingId>(),
				consentAcceptedAt: new Date(),
				actualCheckout: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		}),

	createPet: (
		boardingId: TBoardingId,
		props: Omit<TPetProps, "boardingId">,
	): TPet => ({
		...props,
		id: generateId<TPetId>(),
		boardingId,
		createdAt: new Date(),
		updatedAt: new Date(),
	}),

	createFullBoarding: (
		boardingProps: TBoardingProps,
		petsProps: readonly Omit<TPetProps, "boardingId">[],
	): Effect.Effect<
		TBoardingWithPets,
		InvalidCheckOutDateError | NoPetsProvidedError
	> =>
		Effect.gen(function* () {
			if (petsProps.length === 0) {
				yield* Effect.fail(new NoPetsProvidedError({}));
			}
			const boarding = yield* BoardingModule.createBoarding(boardingProps);
			const pets = petsProps.map((p) =>
				BoardingModule.createPet(boarding.id, p),
			);
			return { ...boarding, pets };
		}),

	updateStatus: (
		boarding: TBoarding,
		nextStatus: TBoardingStatus,
	): Effect.Effect<TBoarding, InvalidStatusTransitionError> =>
		Effect.gen(function* () {
			if (boarding.status === "completed" && nextStatus !== "completed") {
				yield* Effect.fail(
					new InvalidStatusTransitionError({
						currentStatus: boarding.status,
						nextStatus,
					}),
				);
			}
			return {
				...boarding,
				status: nextStatus,
				updatedAt: new Date(),
			};
		}),

	updateDetails: (
		boarding: TBoarding,
		updates: Pick<
			TBoardingProps,
			| "ownerName"
			| "ownerAddress"
			| "ownerPhone"
			| "emergencyContactName"
			| "emergencyContactPhone"
			| "checkInDate"
			| "estimatedCheckOutDate"
			| "notes"
		>,
	): Effect.Effect<TBoarding, InvalidCheckOutDateError> =>
		Effect.gen(function* () {
			if (
				updates.estimatedCheckOutDate !== null &&
				updates.estimatedCheckOutDate < updates.checkInDate
			) {
				yield* Effect.fail(
					new InvalidCheckOutDateError({
						checkInDate: updates.checkInDate,
						estimatedCheckOutDate: updates.estimatedCheckOutDate,
					}),
				);
			}
			return {
				...boarding,
				...updates,
				updatedAt: new Date(),
			};
		}),

	reconstitute: (raw: TBoarding): TBoarding => ({ ...raw }),
	reconstituteWithPets: (raw: TBoardingWithPets): TBoardingWithPets => ({
		...raw,
	}),
} as const;
