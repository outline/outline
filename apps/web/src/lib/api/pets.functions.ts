import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	addPetProgram,
	CreatePetSchema,
	deletePetProgram,
	getPetByIdProgram,
	getPetsByCustomerProgram,
	getPetsProgram,
	type TPetId,
	UpdatePetSchema,
	updatePetProgram,
} from "@/domain/pet";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getPets = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPetsProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const getPetsByCustomer = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((customerId: string) => customerId)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPetsByCustomerProgram(
			businessId as TTenantId,
			data as TCustomerId,
		);
		return await runApp(program);
	});

export const getPetById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ context, data }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Unauthorized");

		const program = getPetByIdProgram(businessId as TTenantId, data as TPetId);
		return await runApp(program);
	});

export const addPet = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => Schema.decodeUnknownSync(CreatePetSchema)(data))
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "pet:write"));
		const program = addPetProgram(tenantId, data);
		return await runApp(program);
	});

export const updatePet = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => Schema.decodeUnknownSync(UpdatePetSchema)(data))
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "pet:write"));
		const program = updatePetProgram(tenantId, data);
		return await runApp(program);
	});

export const deletePet = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ context, data }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "pet:write"));
		const program = deletePetProgram(tenantId, data as TPetId);
		return await runApp(program);
	});
