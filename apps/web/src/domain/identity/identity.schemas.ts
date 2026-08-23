import { Schema } from "effect";

export const UpdateProfileSchema = Schema.Struct({
	fullName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
	phoneNumber: Schema.optionalWith(Schema.String, { exact: true }),
});

export type UpdateProfileCommand = Schema.Schema.Type<
	typeof UpdateProfileSchema
>;

export const UpdateBusinessSchema = Schema.Struct({
	businessId: Schema.String,
	name: Schema.optionalWith(
		Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
		{ exact: true },
	),
	logoUrl: Schema.optionalWith(Schema.String, { exact: true }),
	signatureUrl: Schema.optionalWith(Schema.String, { exact: true }),
	address: Schema.optionalWith(Schema.String.pipe(Schema.maxLength(500)), {
		exact: true,
	}),
	phone: Schema.optionalWith(Schema.String.pipe(Schema.maxLength(20)), {
		exact: true,
	}),
});

export type UpdateBusinessCommand = Schema.Schema.Type<
	typeof UpdateBusinessSchema
>;

export const ChangePasswordSchema = Schema.Struct({
	currentPassword: Schema.String.pipe(Schema.minLength(8)),
	password: Schema.String.pipe(Schema.minLength(8)),
});

export const UpdateEmailSchema = Schema.Struct({
	email: Schema.String.pipe(Schema.minLength(1)),
});

export type UpdateEmailCommand = Schema.Schema.Type<typeof UpdateEmailSchema>;

export type ChangePasswordCommand = Schema.Schema.Type<
	typeof ChangePasswordSchema
>;

export const VerifyPinSchema = Schema.Struct({
	pin: Schema.String.pipe(Schema.length(6)),
});

export type VerifyPinCommand = Schema.Schema.Type<typeof VerifyPinSchema>;

export const SetPinSchema = Schema.Struct({
	currentPassword: Schema.String.pipe(Schema.minLength(8)),
	pin: Schema.String.pipe(Schema.length(6)),
});

export type SetPinCommand = Schema.Schema.Type<typeof SetPinSchema>;
