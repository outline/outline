import { Context, type Effect } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { StaffScheduleNotFoundError } from "./shift.errors";
import type {
	TStaffAttendance,
	TStaffSchedule,
	TStaffScheduleId,
} from "./shift.types";

export interface IShiftRepository {
	readonly findAllAttendance: (tenantId: TTenantId) => Effect.Effect<
		readonly {
			readonly attendance: TStaffAttendance;
			readonly staffName: string;
		}[],
		DatabaseError
	>;
	readonly findSchedulesByStaffId: (
		staffId: TStaffId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TStaffSchedule[], DatabaseError>;

	readonly saveSchedule: (
		schedule: Omit<TStaffSchedule, "id" | "createdAt" | "updatedAt">,
	) => Effect.Effect<TStaffSchedule, DatabaseError>;

	readonly updateSchedule: (
		id: TStaffScheduleId,
		tenantId: TTenantId,
		schedule: Partial<
			Omit<TStaffSchedule, "id" | "tenantId" | "createdAt" | "updatedAt">
		>,
	) => Effect.Effect<
		TStaffSchedule,
		DatabaseError | StaffScheduleNotFoundError
	>;

	readonly deleteSchedule: (
		id: TStaffScheduleId,
		tenantId: TTenantId,
	) => Effect.Effect<void, DatabaseError>;

	readonly findAttendanceByDate: (
		staffId: TStaffId,
		date: string,
		tenantId: TTenantId,
	) => Effect.Effect<TStaffAttendance | null, DatabaseError>;

	readonly findAttendanceByDateRange: (
		staffId: TStaffId,
		startDate: string,
		endDate: string,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TStaffAttendance[], DatabaseError>;

	readonly saveAttendance: (
		attendance: Omit<TStaffAttendance, "id" | "createdAt" | "updatedAt">,
	) => Effect.Effect<TStaffAttendance, DatabaseError>;

	readonly updateAttendance: (
		id: string,
		tenantId: TTenantId,
		updates: Partial<Pick<TStaffAttendance, "clockOut" | "notes">>,
	) => Effect.Effect<TStaffAttendance, DatabaseError>;
}

export const ShiftRepository =
	Context.GenericTag<IShiftRepository>("ShiftRepository");
