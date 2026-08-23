import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { getDashboardMetricsProgram } from "@/domain/accounting";
import {
	addBoardingChargeProgram,
	addBoardingDailyPhotoProgram,
	createBoardingProgram,
	deleteBoardingProgram,
	getBoardingByIdProgram,
	getBoardingChargesProgram,
	getBoardingPhotosProgram,
	getBoardingsProgram,
	updateBoardingProgram,
	updateBoardingStatusProgram,
} from "@/domain/boarding/boarding.programs";
import {
	AddBoardingChargeSchema,
	AddBoardingDailyPhotoSchema,
	CreateBoardingSchema,
	UpdateBoardingSchema,
	UpdateBoardingStatusSchema,
} from "@/domain/boarding/boarding.schemas";
import { getOrCreateCustomerProgram } from "@/domain/customer/customer.programs";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import { triggerBackgroundProcess } from "@/infra/runtime/queue.runner";
import { IQueue } from "@/shared/ports/queue.port";
import { makeQueueIdempotencyKey } from "@/shared/utils/queue-idempotency";

const ImportRequestIdSchema = Schema.String.pipe(
	Schema.minLength(8),
	Schema.maxLength(200),
);

const ImportBoardingsRequestSchema = Schema.Struct({
	importRequestId: ImportRequestIdSchema,
	rows: Schema.Array(CreateBoardingSchema),
});

export const createBoarding = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateBoardingSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));

		const finalData = { ...data };

		if (!finalData.customerId) {
			const customerProgram = getOrCreateCustomerProgram(tenantId, {
				fullName: finalData.ownerName,
				phone: finalData.ownerPhone,
				address: finalData.ownerAddress,
			});
			try {
				const newCustomer = await runApp(customerProgram);
				finalData.customerId = newCustomer.id;
			} catch (error) {
				console.error("[createBoarding] Error creating customer:", error);
				throw new Error("Gagal membuat data pelanggan baru.");
			}
		}

		return await runApp(createBoardingProgram(finalData, tenantId, userId));
	});

export const getBoardings = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		return await runApp(getBoardingsProgram(tenantId));
	});

export const getBoardingById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		return await runApp(getBoardingByIdProgram(id, tenantId));
	});

export const updateBoardingStatus = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateBoardingStatusSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));
		await runApp(updateBoardingStatusProgram(data, tenantId));
		return { success: true };
	});

export const updateBoarding = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateBoardingSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));
		return await runApp(updateBoardingProgram(data, tenantId));
	});

export const deleteBoarding = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));
		await runApp(deleteBoardingProgram(id, tenantId));
		return { success: true };
	});

export const getBoardingCharges = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: boardingId, context }) => {
		const { tenantId } = context;
		return await runApp(getBoardingChargesProgram(boardingId, tenantId));
	});

export const addBoardingCharge = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(AddBoardingChargeSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));
		return await runApp(addBoardingChargeProgram(data, tenantId, userId));
	});

export const getBoardingDailyPhotos = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: boardingId, context }) => {
		const { tenantId } = context;
		return await runApp(getBoardingPhotosProgram(boardingId, tenantId));
	});

export const addBoardingDailyPhoto = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(AddBoardingDailyPhotoSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));
		return await runApp(addBoardingDailyPhotoProgram(data, userId, tenantId));
	});

export const getDashboardMetrics = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		return await runApp(getDashboardMetricsProgram(tenantId));
	});

export const importBoardings = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ImportBoardingsRequestSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "boarding:write"));

		const jobId = await runApp(
			Effect.flatMap(IQueue, (queue) =>
				queue.enqueue(
					"import_boardings",
					{ commands: data.rows, userId },
					tenantId,
					makeQueueIdempotencyKey({
						tenantId,
						operation: "import_boardings",
						importRequestId: data.importRequestId,
					}),
				),
			),
		);

		// Safely extract Cloudflare context from Vinxi/H3 event if running on Workers
		let cfContext: unknown;
		try {
			const mod = "vinxi/http";
			const { getEvent } = await import(/* @vite-ignore */ mod);
			const event = getEvent() as Record<string, unknown>;
			const cfEvent = event?.context as Record<string, unknown> | undefined;
			cfContext = (cfEvent?.cloudflare as Record<string, unknown> | undefined)
				?.context;
		} catch {}

		// Trigger background process asynchronously
		triggerBackgroundProcess(
			jobId,
			cfContext as
				| { readonly waitUntil: (promise: Promise<unknown>) => void }
				| undefined,
		);

		return { success: true, jobId };
	});
