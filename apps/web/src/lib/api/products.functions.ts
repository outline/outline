import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import {
	addProductProgram,
	addVariantProgram,
	deleteProductProgram,
	deleteVariantProgram,
	getFeaturedProductsProgram,
	getProductsProgram,
	toggleFeaturedProductProgram,
	updateProductProgram,
	updateVariantProgram,
} from "@/domain/product/product.programs";
import {
	CreateProductSchema,
	CreateVariantSchema,
	UpdateProductSchema,
	UpdateVariantSchema,
} from "@/domain/product/product.schemas";
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

const ImportProductsRequestSchema = Schema.Struct({
	importRequestId: ImportRequestIdSchema,
	rows: Schema.Array(CreateVariantSchema),
});

export const getProducts = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		try {
			return await runApp(getProductsProgram(tenantId));
		} catch (error) {
			console.error("[getProducts] Critical Error:", error);
			throw error;
		}
	});

export const addProduct = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateProductSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:write"));
		return await runApp(addProductProgram(data, tenantId));
	});

export const updateProduct = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateProductSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:write"));
		return await runApp(updateProductProgram(data, tenantId));
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "product:delete"));
		await runApp(deleteProductProgram(id, tenantId, userId));
		return { success: true };
	});

export const importProducts = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ImportProductsRequestSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:write"));

		const jobId = await runApp(
			Effect.flatMap(IQueue, (queue) =>
				queue.enqueue(
					"import_products",
					data.rows,
					tenantId,
					makeQueueIdempotencyKey({
						tenantId,
						operation: "import_products",
						importRequestId: data.importRequestId,
					}),
				),
			),
		);

		let cfContext: unknown;
		try {
			const mod = "vinxi/http";
			const { getEvent } = await import(/* @vite-ignore */ mod);
			const event = getEvent() as Record<string, unknown>;
			const cfEvent = event?.context as Record<string, unknown> | undefined;
			cfContext = (cfEvent?.cloudflare as Record<string, unknown> | undefined)
				?.context;
		} catch {}

		triggerBackgroundProcess(
			jobId,
			cfContext as
				| { readonly waitUntil: (promise: Promise<unknown>) => void }
				| undefined,
		);

		return { success: true, jobId };
	});

export const addVariant = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateVariantSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:write"));
		return await runApp(addVariantProgram(data, tenantId));
	});

export const updateVariant = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateVariantSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:write"));
		return await runApp(updateVariantProgram(data, tenantId));
	});

export const deleteVariant = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:delete"));
		await runApp(deleteVariantProgram(id, tenantId));
		return { success: true };
	});

export const getFeaturedProducts = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		return await runApp(getFeaturedProductsProgram(tenantId));
	});

export const toggleFeaturedProduct = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(Schema.String))
	.handler(async ({ data: productId, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "product:write"));
		return await runApp(toggleFeaturedProductProgram(productId, tenantId));
	});

export const productsApi = {
	getProducts,
	addProduct,
	updateProduct,
	deleteProduct,
	importProducts,
	addVariant,
	updateVariant,
	deleteVariant,
	getFeaturedProducts,
	toggleFeaturedProduct,
};
