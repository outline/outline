import { Data } from "effect";

export class AppointmentNotFoundError extends Data.TaggedError(
	"AppointmentNotFoundError",
)<{
	readonly appointmentId: string;
}> {}

export class GroomingServiceNotFoundError extends Data.TaggedError(
	"GroomingServiceNotFoundError",
)<{
	readonly serviceId: string;
}> {}

export class SlotConflictError extends Data.TaggedError("SlotConflictError")<{
	readonly groomerId: string;
	readonly startTime: Date;
	readonly endTime: Date;
}> {}

export class AddonNotFoundError extends Data.TaggedError("AddonNotFoundError")<{
	readonly addonId: string;
}> {}
