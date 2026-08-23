import { describe, expect, it, vi } from "vitest";
import { createCatalogHandlers } from "./catalog.handlers";

describe("REST catalog handlers", () => {
	it("lists authenticated catalog resources", async () => {
		const handlers = createCatalogHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			products: vi.fn().mockResolvedValue([{ id: "product-1" }]),
			customers: vi.fn().mockResolvedValue([{ id: "customer-1" }]),
			pets: vi.fn().mockResolvedValue([{ id: "pet-1" }]),
			staff: vi.fn().mockResolvedValue([{ userId: "user-1" }]),
			createCustomer: vi.fn(),
			updateCustomer: vi.fn(),
			deleteCustomer: vi.fn(),
			createPet: vi.fn(),
			updatePet: vi.fn(),
			deletePet: vi.fn(),
			createProduct: vi.fn(),
			updateProduct: vi.fn(),
			deleteProduct: vi.fn(),
		});

		for (const resource of [
			"products",
			"customers",
			"pets",
			"staff",
		] as const) {
			const response = await handlers.list(
				resource,
				new Request(`https://pet-store.test/api/v1/admin/${resource}`, {
					headers: { Cookie: "session_token=token-1" },
				}),
				"catalog-request",
			);

			expect(response.status).toBe(200);
			expect((await response.json()).success).toBe(true);
		}
	});

	it("rejects catalog access without a session", async () => {
		const products = vi.fn();
		const handlers = createCatalogHandlers({
			session: vi.fn().mockResolvedValue(null),
			products,
			customers: vi.fn(),
			pets: vi.fn(),
			staff: vi.fn(),
			createCustomer: vi.fn(),
			updateCustomer: vi.fn(),
			deleteCustomer: vi.fn(),
			createPet: vi.fn(),
			updatePet: vi.fn(),
			deletePet: vi.fn(),
			createProduct: vi.fn(),
			updateProduct: vi.fn(),
			deleteProduct: vi.fn(),
		});

		const response = await handlers.list(
			"products",
			new Request("https://pet-store.test/api/v1/admin/products"),
			"catalog-request",
		);

		expect(response.status).toBe(401);
		expect(products).not.toHaveBeenCalled();
	});

	it("creates a customer through the authenticated domain", async () => {
		const createCustomer = vi.fn().mockResolvedValue({
			id: "customer-1",
			fullName: "Maya",
		});
		const handlers = createCatalogHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			products: vi.fn(),
			customers: vi.fn(),
			pets: vi.fn(),
			staff: vi.fn(),
			createCustomer,
			updateCustomer: vi.fn(),
			deleteCustomer: vi.fn(),
			createPet: vi.fn(),
			updatePet: vi.fn(),
			deletePet: vi.fn(),
			createProduct: vi.fn(),
			updateProduct: vi.fn(),
			deleteProduct: vi.fn(),
		});

		const response = await handlers.mutateCustomer(
			new Request("https://pet-store.test/api/v1/admin/customers", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ fullName: "Maya", phone: "0812" }),
			}),
			"catalog-request",
		);

		expect(response.status).toBe(201);
		expect(createCustomer).toHaveBeenCalledWith("business-1", {
			fullName: "Maya",
			phone: "0812",
		});
	});

	it("creates a product through the authenticated domain", async () => {
		const createProduct = vi.fn().mockResolvedValue({ id: "product-1" });
		const handlers = createCatalogHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			products: vi.fn(),
			customers: vi.fn(),
			pets: vi.fn(),
			staff: vi.fn(),
			createCustomer: vi.fn(),
			updateCustomer: vi.fn(),
			deleteCustomer: vi.fn(),
			createPet: vi.fn(),
			updatePet: vi.fn(),
			deletePet: vi.fn(),
			createProduct,
			updateProduct: vi.fn(),
			deleteProduct: vi.fn(),
		});

		const response = await handlers.mutateProduct(
			new Request("https://pet-store.test/api/v1/admin/products", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "Dog food",
					sku: "DOG-1",
					category: "Food",
					price: 100,
					stock: 5,
					reorderLevel: 2,
				}),
			}),
			"catalog-request",
		);

		expect(response.status).toBe(201);
		expect(createProduct).toHaveBeenCalledWith("business-1", {
			name: "Dog food",
			sku: "DOG-1",
			category: "Food",
			price: 100,
			stock: 5,
			reorderLevel: 2,
		});
	});
});
