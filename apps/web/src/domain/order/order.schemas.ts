import {
	CreateOrderItemSchema as PetsoCreateOrderItemSchema,
	CreateOrderPaymentSchema as PetsoCreateOrderPaymentSchema,
	CreateOrderSchema as PetsoCreateOrderSchema,
} from "@treonstudio/petso-lib/schemas";
import { Schema } from "effect";

export const CreateOrderItemSchema = PetsoCreateOrderItemSchema;
export const CreateOrderPaymentSchema = PetsoCreateOrderPaymentSchema;
export const CreateOrderSchema = PetsoCreateOrderSchema;

export type CreateOrderCommand = Schema.Schema.Type<typeof CreateOrderSchema>;

export const VoidOrderSchema = Schema.Struct({
	orderId: Schema.String,
	reason: Schema.String.pipe(Schema.minLength(1)),
});

export type VoidOrderCommand = Schema.Schema.Type<typeof VoidOrderSchema>;

export const UpdateOrderTrackingCommand = Schema.Struct({
	status: Schema.Union(
		Schema.Literal("confirmed"),
		Schema.Literal("processing"),
		Schema.Literal("shipped"),
		Schema.Literal("delivered"),
		Schema.Literal("cancelled"),
	),
	trackingNumber: Schema.optional(Schema.String),
	shippingCarrier: Schema.optional(Schema.String),
	cancelledReason: Schema.optional(Schema.String),
});

export const UpdateOrderStatusCommand = Schema.Struct({
	orderId: Schema.String,
	status: Schema.Union(
		Schema.Literal("confirmed"),
		Schema.Literal("processing"),
		Schema.Literal("shipped"),
		Schema.Literal("delivered"),
		Schema.Literal("cancelled"),
	),
	trackingNumber: Schema.optional(Schema.String),
	shippingCarrier: Schema.optional(Schema.String),
	cancelledReason: Schema.optional(Schema.String),
});

export type UpdateOrderStatusCommand = Schema.Schema.Type<
	typeof UpdateOrderStatusCommand
>;
