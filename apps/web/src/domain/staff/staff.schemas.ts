import { Schema } from "effect";

export const InviteStaffSchema = Schema.Struct({
	email: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
	branchId: Schema.String,
	role: Schema.Union(
		Schema.Literal("owner"),
		Schema.Literal("manager"),
		Schema.Literal("kasir"),
		Schema.Literal("staff_daycare"),
	),
});

export type InviteStaffCommand = Schema.Schema.Type<typeof InviteStaffSchema>;

export const RemoveStaffSchema = Schema.Struct({
	userId: Schema.String,
	branchId: Schema.String,
});

export type RemoveStaffCommand = Schema.Schema.Type<typeof RemoveStaffSchema>;
