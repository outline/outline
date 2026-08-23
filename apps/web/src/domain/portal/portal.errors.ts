import { Data } from "effect";

export class PortalError extends Data.TaggedError("PortalError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}
