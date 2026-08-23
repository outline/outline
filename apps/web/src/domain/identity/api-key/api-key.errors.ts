import { Data } from "effect";

export class ApiKeyNotFound extends Data.TaggedError("ApiKeyNotFound")<{
	readonly message: string;
}> {}

export class ApiKeyNotActive extends Data.TaggedError("ApiKeyNotActive")<{
	readonly message: string;
}> {}

export class ApiKeyExpired extends Data.TaggedError("ApiKeyExpired")<{
	readonly message: string;
}> {}

export class ApiKeyScopeMissing extends Data.TaggedError("ApiKeyScopeMissing")<{
	readonly message: string;
	readonly requiredScope: string;
}> {}
