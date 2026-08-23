import { Data } from "effect";

export class WarehouseNotFoundError extends Data.TaggedError(
	"WarehouseNotFoundError",
)<{
	readonly id: string;
}> {}

export class RackLocationNotFoundError extends Data.TaggedError(
	"RackLocationNotFoundError",
)<{
	readonly id: string;
}> {}
