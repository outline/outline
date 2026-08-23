import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { createSupplierEntity, updateSupplierEntity } from "./supplier.module";
import type { TSupplier, TSupplierId } from "./supplier.types";

describe("SupplierModule", () => {
	describe("createSupplierEntity", () => {
		it("should create a supplier with correct fields", () => {
			const tenantId = generateId<TTenantId>();
			const input = {
				name: "ACME Corp",
				contactPerson: "John Doe",
				phone: "08123456789",
				email: "john@acme.com",
				address: "123 Main St",
				notes: "Preferred supplier",
			};

			const result = Effect.runSync(createSupplierEntity(input, tenantId));

			expect(result.id).toBeDefined();
			expect(result.tenantId).toBe(tenantId);
			expect(result.name).toBe("ACME Corp");
			expect(result.contactPerson).toBe("John Doe");
			expect(result.phone).toBe("08123456789");
			expect(result.email).toBe("john@acme.com");
			expect(result.address).toBe("123 Main St");
			expect(result.notes).toBe("Preferred supplier");
			expect(result.isActive).toBe(true);
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it("should default optional fields to null", () => {
			const tenantId = generateId<TTenantId>();
			const input = { name: "Simple Supplier" };

			const result = Effect.runSync(createSupplierEntity(input, tenantId));

			expect(result.name).toBe("Simple Supplier");
			expect(result.contactPerson).toBeNull();
			expect(result.phone).toBeNull();
			expect(result.email).toBeNull();
			expect(result.address).toBeNull();
			expect(result.notes).toBeNull();
		});
	});

	describe("updateSupplierEntity", () => {
		const baseSupplier: TSupplier = {
			id: generateId<TSupplierId>(),
			tenantId: generateId<TTenantId>(),
			name: "Original Name",
			contactPerson: "Original Contact",
			phone: "081111111111",
			email: "original@test.com",
			address: "Original Address",
			notes: "Original notes",
			isActive: true,
			createdAt: new Date("2026-01-01"),
			updatedAt: new Date("2026-01-01"),
		};

		it("should update only provided fields", () => {
			const result = Effect.runSync(
				updateSupplierEntity(baseSupplier, {
					id: baseSupplier.id,
					name: "Updated Name",
					phone: "082222222222",
				}),
			);

			expect(result.name).toBe("Updated Name");
			expect(result.phone).toBe("082222222222");
			expect(result.contactPerson).toBe("Original Contact");
			expect(result.email).toBe("original@test.com");
			expect(result.address).toBe("Original Address");
			expect(result.notes).toBe("Original notes");
			expect(result.isActive).toBe(true);
			expect(result.updatedAt.getTime()).toBeGreaterThan(
				baseSupplier.updatedAt.getTime(),
			);
		});

		it("should update isActive to false", () => {
			const result = Effect.runSync(
				updateSupplierEntity(baseSupplier, {
					id: baseSupplier.id,
					isActive: false,
				}),
			);

			expect(result.isActive).toBe(false);
		});

		it("should set optional fields to null when explicitly provided as null", () => {
			const result = Effect.runSync(
				updateSupplierEntity(baseSupplier, {
					id: baseSupplier.id,
					contactPerson: null,
					phone: null,
				}),
			);

			expect(result.contactPerson).toBeNull();
			expect(result.phone).toBeNull();
			expect(result.name).toBe("Original Name");
		});

		it("should not change fields when input is empty", () => {
			const result = Effect.runSync(
				updateSupplierEntity(baseSupplier, { id: baseSupplier.id }),
			);

			expect(result.name).toBe("Original Name");
			expect(result.contactPerson).toBe("Original Contact");
			expect(result.phone).toBe("081111111111");
			expect(result.email).toBe("original@test.com");
			expect(result.address).toBe("Original Address");
			expect(result.notes).toBe("Original notes");
			expect(result.isActive).toBe(true);
		});
	});
});
