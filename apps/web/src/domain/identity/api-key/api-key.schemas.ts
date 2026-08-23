import { Schema } from "effect";

export const ApiKeyScopeSchema = Schema.Union(
	Schema.Literal("products:read"),
	Schema.Literal("categories:read"),
	Schema.Literal("orders:write"),
);

export const CreateApiKeySchema = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	scopes: Schema.Array(ApiKeyScopeSchema).pipe(Schema.minItems(1)),
	expiresAt: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export const UpdateApiKeySchema = Schema.Struct({
	id: Schema.String,
	name: Schema.optionalWith(Schema.String.pipe(Schema.minLength(1)), {
		exact: true,
	}),
	scopes: Schema.optionalWith(
		Schema.Array(ApiKeyScopeSchema).pipe(Schema.minItems(1)),
		{ exact: true },
	),
});

export type CreateApiKeyCommand = Schema.Schema.Type<typeof CreateApiKeySchema>;
export type UpdateApiKeyCommand = Schema.Schema.Type<typeof UpdateApiKeySchema>;
