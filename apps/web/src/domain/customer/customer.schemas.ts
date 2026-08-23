import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

export const customerSchema = z.object({
	id: z.string(),
	businessId: z.string(),
	userId: z.string().nullable(),
	fullName: z.string().min(2, "Nama minimal 2 karakter"),
	phone: z.string().refine((val) => {
		try {
			const phoneNumber = parsePhoneNumberFromString(val, "ID");
			return phoneNumber?.isValid() || val.length >= 10;
		} catch {
			return val.length >= 10;
		}
	}, "Nomor telepon tidak valid"),
	email: z
		.string()
		.email("Email tidak valid")
		.nullable()
		.optional()
		.or(z.literal("")),
	address: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createCustomerSchema = z.object({
	fullName: z.string().min(2, "Nama minimal 2 karakter"),
	phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
	email: z.string().email("Email tidak valid").optional().or(z.literal("")),
	address: z.string().optional(),
	notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
	id: z.string(),
	isActive: z.boolean().optional(),
});
