import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createCustomerProgram,
	deleteCustomerProgram,
	getCustomerByIdProgram,
	getCustomersProgram,
	getOrCreateCustomerProgram,
	updateCustomerProgram,
} from "./customer.programs";
import { ICustomerRepository } from "./customer.repository";
import type {
	ICreateCustomerCommand,
	ICustomer,
	IUpdateCustomerCommand,
	TCustomerId,
} from "./customer.types";

describe("CustomerPrograms", () => {
	const businessId = generateId<TTenantId>();

	const makeCustomer = (overrides: Partial<ICustomer> = {}): ICustomer => ({
		id: generateId() as TCustomerId,
		businessId,
		userId: null,
		fullName: "Test Customer",
		phone: "08123456789",
		email: null,
		address: null,
		notes: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});

	describe("getCustomersProgram", () => {
		it("should return reconstituted customers", async () => {
			const customers = [makeCustomer({ fullName: "Alice" })];
			const findAll = vi.fn().mockReturnValue(Effect.succeed(customers));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll,
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				getCustomersProgram(businessId).pipe(Effect.provide(TestLayer)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.fullName).toBe("Alice");
			expect(findAll).toHaveBeenCalledWith(businessId, undefined);
		});

		it("should pass search parameter", async () => {
			const findAll = vi.fn().mockReturnValue(Effect.succeed([]));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll,
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			await Effect.runPromise(
				getCustomersProgram(businessId, "Alice").pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(findAll).toHaveBeenCalledWith(businessId, "Alice");
		});

		it("should propagate DatabaseError", async () => {
			const findAll = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll,
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					getCustomersProgram(businessId).pipe(Effect.provide(TestLayer)),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getCustomerByIdProgram", () => {
		it("should return customer when found", async () => {
			const customer = makeCustomer({ fullName: "Bob" });
			const findById = vi.fn().mockReturnValue(Effect.succeed(customer));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById,
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				getCustomerByIdProgram(businessId, customer.id).pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(result).not.toBeNull();
			expect(result?.fullName).toBe("Bob");
			expect(findById).toHaveBeenCalledWith(businessId, customer.id);
		});

		it("should return null when not found", async () => {
			const findById = vi.fn().mockReturnValue(Effect.succeed(null));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById,
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				getCustomerByIdProgram(businessId, "nonexistent" as TCustomerId).pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(result).toBeNull();
		});

		it("should propagate DatabaseError", async () => {
			const findById = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById,
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					getCustomerByIdProgram(businessId, "any" as TCustomerId).pipe(
						Effect.provide(TestLayer),
					),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("createCustomerProgram", () => {
		it("should create and return customer", async () => {
			const command: ICreateCustomerCommand = {
				fullName: "New Customer",
				phone: "0815555555",
			};
			const created = makeCustomer({
				fullName: "New Customer",
				phone: "0815555555",
			});
			const create = vi.fn().mockReturnValue(Effect.succeed(created));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create,
				update: vi.fn(),
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				createCustomerProgram(businessId, command).pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(result.fullName).toBe("New Customer");
			expect(create).toHaveBeenCalledWith(businessId, command);
		});

		it("should propagate DatabaseError", async () => {
			const command: ICreateCustomerCommand = {
				fullName: "Fail",
				phone: "0815555555",
			};
			const create = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create,
				update: vi.fn(),
				delete: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					createCustomerProgram(businessId, command).pipe(
						Effect.provide(TestLayer),
					),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getOrCreateCustomerProgram", () => {
		it("should return existing customer by phone", async () => {
			const existing = makeCustomer({
				fullName: "Existing",
				phone: "0813333333",
			});
			const command: ICreateCustomerCommand = {
				fullName: "Existing",
				phone: "0813333333",
			};
			const findByPhone = vi.fn().mockReturnValue(Effect.succeed(existing));
			const create = vi.fn();
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone,
				create,
				update: vi.fn(),
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				getOrCreateCustomerProgram(businessId, command).pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(result.fullName).toBe("Existing");
			expect(findByPhone).toHaveBeenCalledWith(businessId, "0813333333");
			expect(create).not.toHaveBeenCalled();
		});

		it("should create new customer when phone not found", async () => {
			const command: ICreateCustomerCommand = {
				fullName: "New",
				phone: "0814444444",
			};
			const created = makeCustomer({ fullName: "New", phone: "0814444444" });
			const findByPhone = vi.fn().mockReturnValue(Effect.succeed(null));
			const create = vi.fn().mockReturnValue(Effect.succeed(created));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone,
				create,
				update: vi.fn(),
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				getOrCreateCustomerProgram(businessId, command).pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(result.fullName).toBe("New");
			expect(findByPhone).toHaveBeenCalledWith(businessId, "0814444444");
			expect(create).toHaveBeenCalledWith(businessId, command);
		});

		it("should propagate DatabaseError when findByPhone fails", async () => {
			const command: ICreateCustomerCommand = {
				fullName: "Fail",
				phone: "0815555555",
			};
			const findByPhone = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone,
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					getOrCreateCustomerProgram(businessId, command).pipe(
						Effect.provide(TestLayer),
					),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("updateCustomerProgram", () => {
		it("should update and return customer", async () => {
			const command: IUpdateCustomerCommand = {
				id: generateId() as TCustomerId,
				fullName: "Updated",
			};
			const updated = makeCustomer({ id: command.id, fullName: "Updated" });
			const update = vi.fn().mockReturnValue(Effect.succeed(updated));
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update,
				delete: vi.fn(),
			});

			const result = await Effect.runPromise(
				updateCustomerProgram(businessId, command).pipe(
					Effect.provide(TestLayer),
				),
			);

			expect(result.fullName).toBe("Updated");
			expect(update).toHaveBeenCalledWith(businessId, command);
		});

		it("should propagate DatabaseError", async () => {
			const command: IUpdateCustomerCommand = {
				id: generateId() as TCustomerId,
				fullName: "Fail",
			};
			const update = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update,
				delete: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					updateCustomerProgram(businessId, command).pipe(
						Effect.provide(TestLayer),
					),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("deleteCustomerProgram", () => {
		it("should delete customer by id", async () => {
			const deleteFn = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: deleteFn,
			});

			const id = generateId();
			await Effect.runPromise(
				deleteCustomerProgram(businessId, id).pipe(Effect.provide(TestLayer)),
			);

			expect(deleteFn).toHaveBeenCalledWith(businessId, id as TCustomerId);
		});

		it("should propagate DatabaseError", async () => {
			const deleteFn = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(ICustomerRepository, {
				findAll: vi.fn(),
				findById: vi.fn(),
				findByPhone: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: deleteFn,
			});

			await expect(
				Effect.runPromise(
					deleteCustomerProgram(businessId, "any").pipe(
						Effect.provide(TestLayer),
					),
				),
			).rejects.toThrow("DatabaseError");
		});
	});
});
