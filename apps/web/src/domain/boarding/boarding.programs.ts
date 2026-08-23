import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { ICustomerRepository, type TCustomerId } from "@/domain/customer";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IEmailPort } from "@/shared/ports/email.port";
import {
	type TBoardingWithPetsDto,
	toBoardingWithPetsDto,
} from "./boarding.dto";
import { buildReadyForPickupEmail } from "./emails/ready-for-pickup.email";
import {
	BoardingNotFoundError,
	type InvalidCheckOutDateError,
	type InvalidStatusTransitionError,
	type NoPetsProvidedError,
} from "./boarding.errors";
import { BoardingModule } from "./boarding.module";
import { IBoardingRepository } from "./boarding.repository";
import type {
	AddBoardingChargeCommand,
	AddBoardingDailyPhotoCommand,
	CreateBoardingCommand,
	UpdateBoardingCommand,
	UpdateBoardingStatusCommand,
} from "./boarding.schemas";
import type {
	TBoardingChargeId,
	TBoardingDailyPhotoId,
	TBoardingId,
	TBoardingStatus,
	TPetKind,
} from "./boarding.types";

export const getBoardingsProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TBoardingWithPetsDto[],
	DatabaseError,
	IBoardingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const boardings = yield* repo.findAll(tenantId);
		return boardings.map(toBoardingWithPetsDto);
	});

export const getBoardingByIdProgram = (
	id: string,
	tenantId: TTenantId,
): Effect.Effect<
	TBoardingWithPetsDto,
	DatabaseError | BoardingNotFoundError,
	IBoardingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const boarding = yield* repo.findById(id as TBoardingId, tenantId);

		if (!boarding) {
			return yield* Effect.fail(new BoardingNotFoundError({ id }));
		}

		return toBoardingWithPetsDto(boarding);
	});

export const createBoardingProgram = (
	command: CreateBoardingCommand,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<
	TBoardingWithPetsDto,
	DatabaseError | InvalidCheckOutDateError | NoPetsProvidedError,
	IBoardingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;

		const boardingWithPets = yield* BoardingModule.createFullBoarding(
			{
				tenantId,
				branchId: command.branchId as TBranchId,
				customerId: command.customerId || null,
				ownerName: command.ownerName,
				ownerAddress: command.ownerAddress,
				ownerPhone: command.ownerPhone,
				emergencyContactName: command.emergencyContactName || "",
				emergencyContactPhone: command.emergencyContactPhone || "",
				checkInDate: new Date(command.checkInDate),
				estimatedCheckOutDate: command.estimatedCheckOutDate
					? new Date(command.estimatedCheckOutDate)
					: null,
				notes: command.notes || "",
				status: (command.status || "active") as TBoardingStatus,
				roomId:
					(command.roomId as import("../room/room.types").TRoomId) || null,
				dailyRate: command.dailyRate || 0,
				totalAmount: 0,
				ownerSignature: command.ownerSignature || null,
				createdBy: userId,
			},
			command.pets.map((p) => ({
				name: p.name,
				kind: p.kind as TPetKind,
				breed: p.breed,
				vaccinated: p.vaccinated as "yes" | "no",
				weight: p.weight,
				healthStatus: p.healthStatus,
				initialCondition: p.initialCondition || "",
				notes: p.notes || "",
			})),
		);

		yield* repo.saveFull(boardingWithPets);

		return toBoardingWithPetsDto(boardingWithPets);
	});

export const updateBoardingProgram = (
	command: UpdateBoardingCommand,
	tenantId: TTenantId,
): Effect.Effect<
	TBoardingWithPetsDto,
	DatabaseError | BoardingNotFoundError,
	IBoardingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const id = command.id as TBoardingId;

		const existing = yield* repo.findById(id, tenantId);
		if (!existing) return yield* Effect.fail(new BoardingNotFoundError({ id }));

		const updated = {
			...existing,
			ownerName: command.ownerName,
			ownerAddress: command.ownerAddress,
			ownerPhone: command.ownerPhone,
			emergencyContactName: command.emergencyContactName,
			emergencyContactPhone: command.emergencyContactPhone,
			checkInDate: command.checkInDate,
			estimatedCheckOutDate: command.estimatedCheckOutDate,
			notes: command.notes,
			roomId: (command.roomId as import("../room/room.types").TRoomId) || null,
			dailyRate: command.dailyRate || 0,
			pets: command.pets.map((p, i) => ({
				id: (p.id ??
					existing.pets[i]?.id ??
					`new-pet-${i}`) as import("./boarding.types").TPetId,
				boardingId: id,
				name: p.name,
				kind: p.kind as import("./boarding.types").TPetKind,
				breed: p.breed,
				vaccinated: p.vaccinated as "yes" | "no",
				weight: p.weight,
				healthStatus: p.healthStatus,
				initialCondition: p.initialCondition,
				notes: p.notes,
				createdAt: existing.pets[i]?.createdAt ?? new Date(),
				updatedAt: new Date(),
			})),
		};

		yield* repo.updateFull(updated);

		return toBoardingWithPetsDto(updated);
	});

const sendReadyForPickupEmail = (
	boardingWithPets: {
		readonly id: TBoardingId;
		readonly customerId: string | null;
		readonly ownerName: string;
		readonly pets: readonly { readonly name: string }[];
	},
	tenantId: TTenantId,
): Effect.Effect<void, never, ICustomerRepository | IEmailPort> =>
	Effect.gen(function* () {
		if (!boardingWithPets.customerId) return;

		const customerRepo = yield* ICustomerRepository;
		const customer = yield* customerRepo.findById(
			tenantId,
			boardingWithPets.customerId as TCustomerId,
		);

		if (!customer?.email) return;

		const emailPort = yield* IEmailPort;
		const { subject, text, html } = buildReadyForPickupEmail(
			boardingWithPets.pets.map((p) => p.name),
			boardingWithPets.ownerName,
		);

		yield* emailPort.sendEmail({
			to: customer.email,
			subject,
			text,
			html,
			idempotencyKey: `boarding:${boardingWithPets.id}:completed`,
		});
	}).pipe(Effect.catchAll(() => Effect.void));

export const updateBoardingStatusProgram = (
	command: UpdateBoardingStatusCommand,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | BoardingNotFoundError | InvalidStatusTransitionError,
	IBoardingRepository | ICustomerRepository | IEmailPort
> =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const id = command.id as TBoardingId;

		const boardingWithPets = yield* repo.findById(id, tenantId);
		if (!boardingWithPets)
			return yield* Effect.fail(new BoardingNotFoundError({ id }));

		const updatedBoarding = yield* BoardingModule.updateStatus(
			boardingWithPets,
			command.status as TBoardingStatus,
		);

		if (command.status === "completed") {
			const charges = yield* repo.getCharges(id, tenantId);
			const actualCheckout = new Date();

			// Calculate days (minimum 1 day)
			const msPerDay = 1000 * 60 * 60 * 24;
			const timeDiff =
				actualCheckout.getTime() - boardingWithPets.checkInDate.getTime();
			const days = Math.max(1, Math.ceil(timeDiff / msPerDay));

			const roomTotal = days * boardingWithPets.dailyRate;
			const chargesTotal = charges.reduce((acc, curr) => acc + curr.amount, 0);
			const totalAmount = roomTotal + chargesTotal;

			// We need to mutate updatedBoarding with these fields
			const finalBoarding = {
				...updatedBoarding,
				actualCheckout,
				totalAmount,
			};
			yield* repo.update(finalBoarding);
			yield* sendReadyForPickupEmail(boardingWithPets, tenantId);
		} else {
			yield* repo.update(updatedBoarding);
		}
	});

export const deleteBoardingProgram = (
	id: string,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | BoardingNotFoundError,
	IBoardingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const boardingId = id as TBoardingId;

		const boardingWithPets = yield* repo.findById(boardingId, tenantId);
		if (!boardingWithPets)
			return yield* Effect.fail(new BoardingNotFoundError({ id: boardingId }));

		yield* repo.delete(boardingId, tenantId);
	});

export const getBoardingChargesProgram = (
	boardingId: string,
	tenantId: TTenantId,
) =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		return yield* repo.getCharges(boardingId as TBoardingId, tenantId);
	});

export const addBoardingChargeProgram = (
	command: AddBoardingChargeCommand,
	tenantId: TTenantId,
	userId: TUserId,
) =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const id = generateId<TBoardingChargeId>();

		yield* repo.addCharge(
			{
				id,
				boardingId: command.boardingId as TBoardingId,
				tenantId,
				description: command.description,
				amount: command.amount,
				chargeDate: new Date(),
				createdBy: userId,
			},
			tenantId,
		);

		return { success: true };
	});

export const getBoardingPhotosProgram = (
	boardingId: string,
	tenantId: TTenantId,
) =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		return yield* repo.getPhotos(boardingId as TBoardingId, tenantId);
	});

export const addBoardingDailyPhotoProgram = (
	command: AddBoardingDailyPhotoCommand,
	userId: TUserId,
	tenantId: TTenantId,
) =>
	Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		const id = generateId<TBoardingDailyPhotoId>();

		yield* repo.addPhoto(
			{
				id,
				boardingId: command.boardingId as TBoardingId,
				photoUrl: command.photoUrl,
				caption: command.caption || null,
				takenDate: command.takenDate,
				uploadedAt: new Date(),
				uploadedBy: userId,
			},
			tenantId,
		);

		return { success: true };
	});

export const importBoardingsProgram = (
	commands: readonly CreateBoardingCommand[],
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<
	{ imported: number; skipped: number; errors: readonly string[] },
	DatabaseError,
	IBoardingRepository
> =>
	Effect.gen(function* () {
		let imported = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const command of commands) {
			const result = yield* Effect.either(
				createBoardingProgram(command, tenantId, userId),
			);

			if (result._tag === "Right") {
				imported++;
			} else {
				skipped++;
				errors.push(
					`Gagal import penitipan "${command.ownerName}": ${result.left._tag}`,
				);
			}
		}

		return { imported, skipped, errors };
	});
