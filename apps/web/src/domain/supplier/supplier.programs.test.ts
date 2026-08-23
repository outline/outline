import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	addSupplierProgram,
	deleteSupplierProgram,
	getSupplierByIdProgram,
	getSuppliersProgram,
	updateSupplierProgram,
} from "./supplier.programs";
import { ISupplierRepository } from "./supplier.repository";
import type { TCreateSupplierInput } from "./supplier.schemas";
import type { TSupplier, TSupplierId } from "./supplier.types";

const mockTenantId = generateId<TTenantId>();
const mockSupplier: TSupplier = {
	id: generateId<TSupplierId>(),
	tenantId: mockTenantId,
	name: "Test Supplier",
	contactPerson: "Test Contact",
	phone: "08123456789",
	email: "test@supplier.com",
	address: "123 Test St",
	notes: "Test notes",
	isActive: true,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
};

describe("getSuppliersProgram", () => {
	it("should return all suppliers for tenant", async () => {
		const findAll = vi.fn().mockReturnValue(Effect.succeed([mockSupplier]));
		const result = await Effect.runPromise(
			Effect.provide(
				getSuppliersProgram(mockTenantId),
				Layer.succeed(ISupplierRepository, {
					findAll,
					findById: vi.fn(),
					save: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				}),
			),
		);

		expect(result).toEqual([mockSupplier]);
		expect(findAll).toHaveBeenCalledWith(mockTenantId);
	});

	it("should propagate DatabaseError", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getSuppliersProgram(mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						findById: vi.fn(),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getSupplierByIdProgram", () => {
	it("should return supplier when found", async () => {
		const findById = vi.fn().mockReturnValue(Effect.succeed(mockSupplier));
		const result = await Effect.runPromise(
			Effect.provide(
				getSupplierByIdProgram(mockSupplier.id, mockTenantId),
				Layer.succeed(ISupplierRepository, {
					findAll: vi.fn(),
					findById,
					save: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				}),
			),
		);

		expect(result).toEqual(mockSupplier);
		expect(findById).toHaveBeenCalledWith(mockSupplier.id, mockTenantId);
	});

	it("should fail with SupplierNotFoundError when not found", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getSupplierByIdProgram(mockSupplier.id, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn().mockReturnValue(Effect.succeed(null)),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("SupplierNotFoundError"),
		});
	});

	it("should propagate DatabaseError", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getSupplierByIdProgram(mockSupplier.id, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("addSupplierProgram", () => {
	const input: TCreateSupplierInput = {
		name: "New Supplier",
		phone: "08123456789",
	};

	it("should create and save a new supplier", async () => {
		const save = vi.fn().mockReturnValue(Effect.void);
		const result = await Effect.runPromise(
			Effect.provide(
				addSupplierProgram(input, mockTenantId),
				Layer.succeed(ISupplierRepository, {
					findAll: vi.fn(),
					findById: vi.fn(),
					save,
					update: vi.fn(),
					delete: vi.fn(),
				}),
			),
		);

		expect(result.name).toBe("New Supplier");
		expect(result.tenantId).toBe(mockTenantId);
		expect(result.isActive).toBe(true);
		expect(save).toHaveBeenCalledWith(result);
	});

	it("should propagate DatabaseError on save", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					addSupplierProgram(input, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn(),
						save: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("updateSupplierProgram", () => {
	const updateInput = { id: mockSupplier.id, name: "Updated Supplier" };

	it("should update supplier when found", async () => {
		const findById = vi.fn().mockReturnValue(Effect.succeed(mockSupplier));
		const update = vi.fn().mockReturnValue(Effect.void);
		const result = await Effect.runPromise(
			Effect.provide(
				updateSupplierProgram(updateInput, mockTenantId),
				Layer.succeed(ISupplierRepository, {
					findAll: vi.fn(),
					findById,
					save: vi.fn(),
					update,
					delete: vi.fn(),
				}),
			),
		);

		expect(result.name).toBe("Updated Supplier");
		expect(findById).toHaveBeenCalledWith(mockSupplier.id, mockTenantId);
		expect(update).toHaveBeenCalledWith(result);
	});

	it("should fail with SupplierNotFoundError when supplier not found", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					updateSupplierProgram(updateInput, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn().mockReturnValue(Effect.succeed(null)),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("SupplierNotFoundError"),
		});
	});

	it("should propagate DatabaseError from findById", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					updateSupplierProgram(updateInput, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("deleteSupplierProgram", () => {
	it("should delete supplier when found", async () => {
		const findById = vi.fn().mockReturnValue(Effect.succeed(mockSupplier));
		const deleteFn = vi.fn().mockReturnValue(Effect.void);
		const result = await Effect.runPromise(
			Effect.provide(
				deleteSupplierProgram(mockSupplier.id, mockTenantId),
				Layer.succeed(ISupplierRepository, {
					findAll: vi.fn(),
					findById,
					save: vi.fn(),
					update: vi.fn(),
					delete: deleteFn,
				}),
			),
		);

		expect(result).toBeUndefined();
		expect(findById).toHaveBeenCalledWith(mockSupplier.id, mockTenantId);
		expect(deleteFn).toHaveBeenCalledWith(mockSupplier.id, mockTenantId);
	});

	it("should fail with SupplierNotFoundError when supplier not found", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					deleteSupplierProgram(mockSupplier.id, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn().mockReturnValue(Effect.succeed(null)),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("SupplierNotFoundError"),
		});
	});

	it("should propagate DatabaseError from findById", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					deleteSupplierProgram(mockSupplier.id, mockTenantId),
					Layer.succeed(ISupplierRepository, {
						findAll: vi.fn(),
						findById: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						save: vi.fn(),
						update: vi.fn(),
						delete: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});
