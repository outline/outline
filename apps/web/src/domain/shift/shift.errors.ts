import { Data } from "effect";

export class StaffScheduleNotFoundError extends Data.TaggedError(
	"StaffScheduleNotFoundError",
)<{
	readonly id: string;
}> {}

export class StaffAttendanceNotFoundError extends Data.TaggedError(
	"StaffAttendanceNotFoundError",
)<{
	readonly id: string;
}> {}
