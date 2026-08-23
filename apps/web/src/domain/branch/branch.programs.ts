import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { type TBranchDto, toBranchDto } from "./branch.dto";
import { BranchNotFoundError } from "./branch.errors";
import { BranchModule } from "./branch.module";
import { IBranchRepository } from "./branch.repository";
import type {
	CreateBranchCommand,
	CreateBranchHolidayCommand,
	DeleteBranchHolidayCommand,
	ToggleBranchStatusCommand,
	UpdateBranchCommand,
} from "./branch.schemas";
import type {
	TBranch,
	TBranchHoliday,
	TBranchHolidayId,
	TBranchId,
} from "./branch.types";

export const getBranchesProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TBranchDto[], DatabaseError, IBranchRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		const branches = yield* repo.findAll(tenantId);
		return branches.map(toBranchDto);
	});

export const getBranchProgram = (
	branchId: string,
	tenantId: TTenantId,
): Effect.Effect<TBranchDto | null, DatabaseError, IBranchRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		const branch = yield* repo.findById(branchId as TBranchId, tenantId);
		return branch ? toBranchDto(branch) : null;
	});

export const createBranchProgram = (
	command: CreateBranchCommand,
	tenantId: TTenantId,
	userId: string,
): Effect.Effect<TBranchDto, DatabaseError, IBranchRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;

		const branch = BranchModule.create({
			tenantId,
			name: command.name,
			address: command.address,
			phone: command.phone,
			isActive: true,
			email: command.email,
			whatsappNumber: command.whatsappNumber,
			streetAddress: command.streetAddress,
			addressLocality: command.addressLocality,
			addressRegion: command.addressRegion,
			postalCode: command.postalCode,
			addressCountry: command.addressCountry,
			latitude: command.latitude,
			longitude: command.longitude,
			operatingHours: command.operatingHours,
		});

		yield* repo.createBranch(branch, userId);

		return toBranchDto(branch);
	});

export const updateBranchProgram = (
	command: UpdateBranchCommand,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | BranchNotFoundError,
	IBranchRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		const branchId = command.id as TBranchId;

		const existingBranch = yield* repo.findById(branchId, tenantId);
		if (!existingBranch)
			yield* Effect.fail(new BranchNotFoundError({ id: branchId }));

		const updatedBranch = BranchModule.update(
			existingBranch as unknown as TBranch,
			{
				name: command.name,
				address: command.address,
				phone: command.phone,
				email: command.email,
				whatsappNumber: command.whatsappNumber,
				streetAddress: command.streetAddress,
				addressLocality: command.addressLocality,
				addressRegion: command.addressRegion,
				postalCode: command.postalCode,
				addressCountry: command.addressCountry,
				latitude: command.latitude,
				longitude: command.longitude,
				operatingHours: command.operatingHours,
			},
		);

		yield* repo.update(updatedBranch);
	});

export const toggleBranchStatusProgram = (
	command: ToggleBranchStatusCommand,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | BranchNotFoundError,
	IBranchRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		const branchId = command.id as TBranchId;

		const existingBranch = yield* repo.findById(branchId, tenantId);
		if (!existingBranch)
			yield* Effect.fail(new BranchNotFoundError({ id: branchId }));

		const updatedBranch = BranchModule.update(
			existingBranch as unknown as TBranch,
			{
				isActive: command.isActive,
			},
		);

		yield* repo.update(updatedBranch);
	});

export const deleteBranchProgram = (
	id: string,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | BranchNotFoundError,
	IBranchRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		const branchId = id as TBranchId;

		const existingBranch = yield* repo.findById(branchId, tenantId);
		if (!existingBranch)
			yield* Effect.fail(new BranchNotFoundError({ id: branchId }));

		const updatedBranch = BranchModule.update(
			existingBranch as unknown as TBranch,
			{
				isActive: false,
			},
		);

		yield* repo.update(updatedBranch);
	});

export const getBranchHolidaysProgram = (
	branchId: string,
	tenantId: TTenantId,
): Effect.Effect<readonly TBranchHoliday[], DatabaseError, IBranchRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		return yield* repo.findHolidays(branchId as TBranchId, tenantId);
	});

export const createBranchHolidayProgram = (
	command: CreateBranchHolidayCommand,
	tenantId: TTenantId,
): Effect.Effect<TBranchHoliday, DatabaseError, IBranchRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;

		const holiday: TBranchHoliday = {
			id: generateId() as TBranchHolidayId,
			branchId: command.branchId as TBranchId,
			tenantId,
			name: command.name,
			date: new Date(command.date),
			isRecurring: command.isRecurring ?? false,
			createdAt: new Date(),
		};

		yield* repo.saveHoliday(holiday);
		return holiday;
	});

export const deleteBranchHolidayProgram = (
	command: DeleteBranchHolidayCommand,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError, IBranchRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBranchRepository;
		yield* repo.deleteHoliday(
			command.id as TBranchHolidayId,
			command.branchId as TBranchId,
			tenantId,
		);
	});
