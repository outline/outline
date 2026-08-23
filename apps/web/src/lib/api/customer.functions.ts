import { createServerFn } from "@tanstack/react-start";
import {
	createCustomerProgram,
	deleteCustomerProgram,
	getCustomerByIdProgram,
	getCustomersProgram,
	updateCustomerProgram,
} from "@/domain/customer/customer.programs";
import type {
	ICreateCustomerCommand,
	IUpdateCustomerCommand,
} from "@/domain/customer/customer.types";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getCustomers = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((search?: string) => search)
	.handler(async ({ data: search, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getCustomersProgram(businessId as TTenantId, search));
	});

export const getCustomerById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Profil bisnis tidak ditemukan.");
		return await runApp(getCustomerByIdProgram(businessId as TTenantId, id));
	});

export const createCustomer = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => data as ICreateCustomerCommand)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "customer:write"));
		return await runApp(createCustomerProgram(tenantId, data));
	});

export const updateCustomer = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => data as IUpdateCustomerCommand)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "customer:write"));
		return await runApp(updateCustomerProgram(tenantId, data));
	});

export const deleteCustomer = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "customer:write"));
		return await runApp(deleteCustomerProgram(tenantId, id));
	});
