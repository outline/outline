import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { createBoardingProgram } from "@/domain/boarding/boarding.programs";
import { CreateBoardingSchema } from "@/domain/boarding/boarding.schemas";
import {
	BusinessIdSchema,
	GetPublicProductSchema,
	getPublicBranchesProgram,
	getPublicBusinessBySlugProgram,
	getPublicFeaturedProductsProgram,
	getPublicProductProgram,
	getPublicRoomsProgram,
	SlugSchema,
} from "@/domain/public";
import { runApp } from "@/infra/runtime/app.runtime";
import { idempotencyServiceFromAppLayer } from "@/infra/runtime/idempotency-bridge";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { runWithIdempotency } from "@/shared/utils/idempotency";

export const getPublicBusinessBySlug = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(SlugSchema))
	.handler(async ({ data: slug }) => {
		const program = getPublicBusinessBySlugProgram(slug);
		return await runApp(program);
	});

export const getPublicBranches = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(BusinessIdSchema))
	.handler(async ({ data: businessId }) => {
		const program = getPublicBranchesProgram(businessId);
		return await runApp(program);
	});

export const getPublicRooms = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(BusinessIdSchema))
	.handler(async ({ data: businessId }) => {
		const program = getPublicRoomsProgram(businessId);
		return await runApp(program);
	});

export const submitPublicBoarding = createServerFn({ method: "POST" })
	.validator(Schema.decodeUnknownSync(CreateBoardingSchema))
	.handler(async ({ data }) => {
		if (!data.businessId)
			throw new Error("Business ID is required for public submissions.");

		const finalData = { ...data };

		const { idempotencyKey, ...rest } = data;
		const requestPayload = {
			businessId: data.businessId,
			branchId: data.branchId,
			ownerName: data.ownerName,
			ownerAddress: data.ownerAddress,
			ownerPhone: data.ownerPhone,
			checkInDate: data.checkInDate,
			estimatedCheckOutDate: data.estimatedCheckOutDate ?? null,
			petsCount: data.pets.length,
		};

		return await runWithIdempotency(
			{
				tenantId: data.businessId,
				idempotencyKey,
				requestPayload,
			},
			async () => {
				const { getOrCreateCustomerProgram } = await import(
					"@/domain/customer/customer.programs"
				);

				const customerProgram = getOrCreateCustomerProgram(
					data.businessId as TTenantId,
					{
						fullName: finalData.ownerName,
						phone: finalData.ownerPhone,
						address: finalData.ownerAddress,
					},
				);

				try {
					const newCustomer = await runApp(customerProgram);
					finalData.customerId = newCustomer.id;
				} catch (error) {
					console.error(
						"[submitPublicBoarding] Error creating customer:",
						error,
					);
					throw new Error("Gagal membuat data pelanggan.");
				}

				const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

				const program = createBoardingProgram(
					rest,
					data.businessId as TTenantId,
					SYSTEM_USER_ID as TUserId,
				);

				return await runApp(program);
			},
			idempotencyServiceFromAppLayer,
		);
	});

export const getPublicProduct = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(GetPublicProductSchema))
	.handler(async ({ data }) => {
		const program = getPublicProductProgram(data.businessId, data.productId);
		return await runApp(program);
	});

export const getPublicFeaturedProducts = createServerFn({ method: "GET" })
	.validator(Schema.decodeUnknownSync(BusinessIdSchema))
	.handler(async ({ data: businessId }) => {
		const program = getPublicFeaturedProductsProgram(businessId);
		return await runApp(program);
	});
