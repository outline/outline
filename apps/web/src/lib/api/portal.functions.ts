import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBranchesProgram } from "@/domain/branch/branch.programs";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	createPortalBookingProgram,
	createPortalServiceProgram,
	deletePortalServiceProgram,
	getPortalBookingsProgram,
	getPortalConfigBySlugProgram,
	getPortalConfigProgram,
	getPortalReviewsProgram,
	getPortalServicesProgram,
	getPortalStatsProgram,
	updatePortalBookingStatusProgram,
	updatePortalConfigProgram,
} from "@/domain/portal";
import {
	CreatePortalBookingSchema,
	CreatePortalServiceSchema,
	DeletePortalServiceSchema,
	UpdatePortalBookingStatusSchema,
	UpdatePortalConfigSchema,
} from "@/domain/portal/portal.schemas";
import type { TPortalServiceId } from "@/domain/portal/portal.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import { idempotencyServiceFromAppLayer } from "@/infra/runtime/idempotency-bridge";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { runWithIdempotency } from "@/shared/utils/idempotency";

export const getPortalConfig = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;

		const program = getPortalConfigProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const getPortalServices = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPortalServicesProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const updatePortalConfig = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdatePortalConfigSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "portal:write"));

		const program = updatePortalConfigProgram(data, tenantId);
		await runApp(program);

		return { success: true };
	});

export const getPortalBySlug = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: slug }) => {
		const program = getPortalConfigBySlugProgram(slug);
		return await runApp(program);
	});

export const getPortalServicesBySlug = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: slug }) => {
		const config = await runApp(getPortalConfigBySlugProgram(slug));

		if (!config) return [];

		const servicesProgram = getPortalServicesProgram(config.tenantId);
		return await runApp(servicesProgram);
	});

export const getPortalBranchesBySlug = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: slug }) => {
		const config = await runApp(getPortalConfigBySlugProgram(slug));

		if (!config) return [];

		const branches = await runApp(getBranchesProgram(config.tenantId));
		return branches.filter((b) => b.isActive);
	});

export const createPortalBooking = createServerFn({ method: "POST" })
	.validator(Schema.decodeUnknownSync(CreatePortalBookingSchema))
	.handler(async ({ data }) => {
		const config = await runApp(getPortalConfigBySlugProgram(data.slug));

		if (!config) throw new Error("Portal tidak ditemukan.");
		if (!config.isActive) throw new Error("Portal tidak aktif.");
		if (!config.bookingEnabled)
			throw new Error("Pemesanan tidak diaktifkan untuk portal ini.");

		const { idempotencyKey, ...rest } = data;
		const requestPayload = {
			slug: data.slug,
			branchId: data.branchId ?? null,
			serviceId: data.serviceId ?? null,
			customerName: data.customerName,
			customerPhone: data.customerPhone,
			customerEmail: data.customerEmail ?? null,
			petName: data.petName,
			petSpecies: data.petSpecies ?? null,
			petBreed: data.petBreed ?? null,
			scheduledAt: data.scheduledAt.toISOString(),
			notes: data.notes ?? null,
		};

		return await runWithIdempotency(
			{
				tenantId: config.tenantId,
				idempotencyKey,
				requestPayload,
			},
			async () => {
				const program = createPortalBookingProgram(config.tenantId, rest);
				return await runApp(program);
			},
			idempotencyServiceFromAppLayer,
		);
	});

export const getPortalBookings = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPortalBookingsProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const updatePortalBookingStatus = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdatePortalBookingStatusSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "portal:write"));

		const program = updatePortalBookingStatusProgram(tenantId, data);
		await runApp(program);

		return { success: true };
	});

export const getPortalStats = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId)
			return {
				totalReviews: 0,
				averageRating: 0,
				totalServices: 0,
				totalPets: 0,
			};

		const program = getPortalStatsProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const createPortalService = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreatePortalServiceSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "portal:write"));

		const serviceData: Omit<
			import("@/domain/portal/portal.types").TPortalService,
			"id"
		> = {
			tenantId,
			name: data.name,
			description: data.description ?? null,
			durationMinutes: data.durationMinutes,
			price: data.price,
			isActive: true,
			category: data.category ?? null,
		};

		const program = createPortalServiceProgram(tenantId, serviceData);
		const service = await runApp(program);
		return { success: true, service };
	});

export const deletePortalService = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(DeletePortalServiceSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "portal:write"));

		const program = deletePortalServiceProgram(
			tenantId,
			data as TPortalServiceId,
		);
		await runApp(program);
		return { success: true };
	});

export const getPortalReviews = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPortalReviewsProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const portalApi = {
	getPortalConfig,
	getPortalServices,
	updatePortalConfig,
	getPortalBySlug,
	getPortalServicesBySlug,
	getPortalBranchesBySlug,
	createPortalBooking,
	getPortalBookings,
	updatePortalBookingStatus,
	getPortalStats,
	createPortalService,
	deletePortalService,
	getPortalReviews,
};
