import { Effect, Schema } from "effect";
import { getBranchesProgram } from "@/domain/branch/branch.programs";
import {
	createCustomerProgram,
	deleteCustomerProgram,
	getCustomersProgram,
	updateCustomerProgram,
} from "@/domain/customer/customer.programs";
import {
	addBatchProgram,
	deductStockProgram,
	getBatchesProgram,
	getMovementsProgram,
} from "@/domain/inventory/inventory.programs";
import {
	addPetProgram,
	deletePetProgram,
	getPetsProgram,
	updatePetProgram,
} from "@/domain/pet/pet.programs";
import type { TPetId } from "@/domain/pet/pet.types";
import {
	addProductProgram,
	addVariantProgram,
	deleteProductProgram,
	getProductProgram,
	getProductsProgram,
	updateProductProgram,
	updateVariantProgram,
} from "@/domain/product/product.programs";
import {
	CreateProductSchema,
	CreateVariantSchema,
	UpdateProductSchema,
	UpdateVariantSchema,
} from "@/domain/product/product.schemas";
import type { TProductVariantId } from "@/domain/product/product.types";
import { getStaffMembersProgram } from "@/domain/staff/staff.programs";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { type AuthHandlers, createAuthHandlers } from "./auth.handlers";
import { createAuthProgramDependencies } from "./auth.runtime";
import { type BranchHandlers, createBranchHandlers } from "./branch.handlers";
import {
	type CatalogHandlers,
	createCatalogHandlers,
} from "./catalog.handlers";
import {
	createInventoryHandlers,
	type InventoryHandlers,
} from "./inventory.handlers";
import { getRequestId } from "./request-context";
import { jsonSuccess } from "./response";

/**
 * Creates the direct REST request dispatcher.
 *
 * @param authHandlers handlers for the authentication routes.
 * @returns a dispatcher for migrated REST routes.
 */
export function createRestRequestHandler(
	authHandlers: AuthHandlers,
	branchHandlers?: BranchHandlers,
	catalogHandlers?: CatalogHandlers,
	inventoryHandlers?: InventoryHandlers,
): (request: Request) => Promise<Response | undefined> {
	return async (request) => {
		const url = new URL(request.url);
		const requestId = getRequestId(request);

		if (url.pathname === "/api/v1/auth/login" && request.method === "POST") {
			return authHandlers.login(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/signup" && request.method === "POST") {
			return authHandlers.signup(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/logout" && request.method === "POST") {
			return authHandlers.logout(request, requestId);
		}
		if (url.pathname === "/api/v1/auth/session" && request.method === "GET") {
			return authHandlers.session(request, requestId);
		}
		if (
			branchHandlers &&
			url.pathname === "/api/v1/branches" &&
			request.method === "GET"
		) {
			return branchHandlers.list(request, requestId);
		}
		if (
			catalogHandlers &&
			url.pathname.startsWith("/api/v1/admin/") &&
			request.method === "GET"
		) {
			const resource = url.pathname.slice("/api/v1/admin/".length);
			if (
				resource === "products" ||
				resource === "customers" ||
				resource === "pets" ||
				resource === "staff"
			) {
				return catalogHandlers.list(resource, request, requestId);
			}
		}
		if (
			catalogHandlers &&
			url.pathname === "/api/v1/admin/customers" &&
			request.method === "POST"
		) {
			return catalogHandlers.mutateCustomer(request, requestId);
		}
		if (
			catalogHandlers &&
			url.pathname === "/api/v1/admin/pets" &&
			request.method === "POST"
		) {
			return catalogHandlers.mutatePet(request, requestId);
		}
		const petMatch = url.pathname.match(/^\/api\/v1\/admin\/pets\/([^/]+)$/);
		if (
			catalogHandlers &&
			petMatch &&
			(request.method === "PATCH" || request.method === "DELETE")
		) {
			return catalogHandlers.mutatePet(request, requestId, petMatch[1]);
		}
		const customerMatch = url.pathname.match(
			/^\/api\/v1\/admin\/customers\/([^/]+)$/,
		);
		if (
			catalogHandlers &&
			customerMatch &&
			(request.method === "PATCH" || request.method === "DELETE")
		) {
			return catalogHandlers.mutateCustomer(
				request,
				requestId,
				customerMatch[1],
			);
		}
		if (
			catalogHandlers &&
			url.pathname === "/api/v1/admin/products" &&
			request.method === "POST"
		) {
			return catalogHandlers.mutateProduct(request, requestId);
		}
		const productMatch = url.pathname.match(
			/^\/api\/v1\/admin\/products\/([^/]+)$/,
		);
		if (
			catalogHandlers &&
			productMatch &&
			(request.method === "PATCH" || request.method === "DELETE")
		) {
			return catalogHandlers.mutateProduct(request, requestId, productMatch[1]);
		}
		if (
			inventoryHandlers &&
			url.pathname === "/api/v1/admin/inventory" &&
			request.method === "GET"
		) {
			return inventoryHandlers.snapshot(request, requestId);
		}
		if (
			inventoryHandlers &&
			url.pathname === "/api/v1/admin/inventory/adjust" &&
			request.method === "POST"
		) {
			return inventoryHandlers.adjust(request, requestId);
		}
		if (url.pathname === "/api/v1/health" && request.method === "GET") {
			return jsonSuccess({ status: "ok" }, requestId);
		}

		return undefined;
	};
}

const authProgramDependencies = createAuthProgramDependencies();
const defaultRestRequestHandler = createRestRequestHandler(
	createAuthHandlers(authProgramDependencies),
	createBranchHandlers({
		session: async (token) => authProgramDependencies.session(token),
		list: async (businessId) =>
			runApp(getBranchesProgram(businessId as TTenantId)),
	}),
	createCatalogHandlers({
		session: async (token) => authProgramDependencies.session(token),
		products: async (businessId) =>
			runApp(getProductsProgram(businessId as TTenantId)),
		customers: async (businessId) =>
			runApp(getCustomersProgram(businessId as TTenantId)),
		pets: async (businessId) => runApp(getPetsProgram(businessId as TTenantId)),
		staff: async (businessId) =>
			runApp(getStaffMembersProgram(businessId as TTenantId)),
		createCustomer: async (businessId, input) =>
			runApp(createCustomerProgram(businessId as TTenantId, input)),
		updateCustomer: async (businessId, input) =>
			runApp(updateCustomerProgram(businessId as TTenantId, input)),
		deleteCustomer: async (businessId, id) => {
			await runApp(deleteCustomerProgram(businessId as TTenantId, id));
		},
		createPet: async (businessId, input) =>
			runApp(addPetProgram(businessId as TTenantId, input)),
		updatePet: async (businessId, input) =>
			runApp(updatePetProgram(businessId as TTenantId, input)),
		deletePet: async (businessId, id) => {
			await runApp(deletePetProgram(businessId as TTenantId, id as TPetId));
		},
		createProduct: async (businessId, input) => {
			const product = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(CreateProductSchema)({
						name: input.name,
						category: input.category ?? null,
						hasVariants: false,
						isActive: true,
					}),
					(command) => addProductProgram(command, businessId as TTenantId),
				),
			);
			const variant = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(CreateVariantSchema)({
						productId: product.id,
						name: "Default",
						sku: typeof input.sku === "string" ? input.sku : null,
						price: typeof input.price === "number" ? input.price : 0,
						stock: typeof input.stock === "number" ? input.stock : 0,
						lowStockThreshold:
							typeof input.reorderLevel === "number" ? input.reorderLevel : 0,
						unit: "pcs",
					}),
					(command) => addVariantProgram(command, businessId as TTenantId),
				),
			);
			return { ...product, variants: [variant] };
		},
		updateProduct: async (businessId, input) => {
			const product = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(UpdateProductSchema)({
						id: input.id,
						name: input.name,
						category: input.category ?? null,
					}),
					(command) => updateProductProgram(command, businessId as TTenantId),
				),
			);
			const existing = await runApp(
				getProductProgram(product.id, businessId as TTenantId),
			);
			const variant = existing?.variants[0];
			if (!variant) return product;
			const updatedVariant = await runApp(
				Effect.flatMap(
					Schema.decodeUnknown(UpdateVariantSchema)({
						id: variant.id,
						productId: product.id,
						name: variant.name,
						sku: typeof input.sku === "string" ? input.sku : variant.sku,
						price:
							typeof input.price === "number" ? input.price : variant.price,
						stock:
							typeof input.stock === "number" ? input.stock : variant.stock,
						lowStockThreshold:
							typeof input.reorderLevel === "number"
								? input.reorderLevel
								: variant.lowStockThreshold,
						unit: variant.unit,
					}),
					(command) => updateVariantProgram(command, businessId as TTenantId),
				),
			);
			return { ...product, variants: [updatedVariant] };
		},
		deleteProduct: async (businessId, userId, id) => {
			await runApp(
				deleteProductProgram(id, businessId as TTenantId, userId as TUserId),
			);
		},
	}),
	createInventoryHandlers({
		session: async (token) => authProgramDependencies.session(token),
		snapshot: async (businessId) => {
			const products = await runApp(
				getProductsProgram(businessId as TTenantId),
			);
			const variants = products.flatMap((product) => product.variants);
			const batches = await Promise.all(
				variants.map((variant) =>
					runApp(
						getBatchesProgram(
							businessId as TTenantId,
							variant.id as TProductVariantId,
						),
					),
				),
			);
			const movements = await Promise.all(
				variants.map((variant) =>
					runApp(
						getMovementsProgram(
							businessId as TTenantId,
							variant.id as TProductVariantId,
						),
					),
				),
			);
			return {
				batches: batches.flat().map((batch) => ({
					...batch,
					receivedAt: batch.receivedAt.toISOString(),
					expiryDate: batch.expiryDate?.toISOString() ?? null,
					createdAt: batch.createdAt.toISOString(),
					updatedAt: batch.updatedAt.toISOString(),
				})),
				movements: movements.flat().map((movement) => ({
					...movement,
					createdAt: movement.createdAt.toISOString(),
				})),
			};
		},
		adjust: async (businessId, input) => {
			const variantId = String(input.variantId);
			const quantity = typeof input.quantity === "number" ? input.quantity : 0;
			const notes =
				typeof input.notes === "string" ? input.notes : "Manual adjustment";
			if (quantity > 0) {
				await runApp(
					addBatchProgram(businessId as TTenantId, {
						variantId,
						batchNumber: "MANUAL",
						quantity,
						costPrice: 0,
						expiryDate: null,
						notes,
					}),
				);
				return;
			}
			if (quantity < 0) {
				await runApp(
					deductStockProgram(businessId as TTenantId, {
						variantId,
						quantity: Math.abs(quantity),
						referenceType: "adjustment",
						referenceId: crypto.randomUUID(),
						notes,
					}),
				);
			}
		},
	}),
);

/**
 * Handles REST routes that have been migrated to the direct Pet Store API.
 *
 * @param request the incoming HTTP request.
 * @returns a response for a migrated route, or undefined for the legacy route dispatcher.
 */
export async function handleRestRequest(
	request: Request,
): Promise<Response | undefined> {
	return defaultRestRequestHandler(request);
}
