import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { generateId } from "@/shared/utils";
import { CustomerModule } from "./customer.module";
import type { ICustomer, TCustomerId } from "./customer.types";

describe("CustomerModule", () => {
	const businessId = generateId();

	describe("create", () => {
		it("should create a customer with all fields", () => {
			const cmd = {
				fullName: "John Doe",
				phone: "08123456789",
				email: "john@example.com",
				address: "Jl. Merdeka No.1",
				notes: "Regular customer",
			};
			const result = CustomerModule.create(businessId, cmd);

			expect(result.id).toBeDefined();
			expect(result.businessId).toBe(businessId);
			expect(result.fullName).toBe("John Doe");
			expect(result.phone).toBe("08123456789");
			expect(result.email).toBe("john@example.com");
			expect(result.address).toBe("Jl. Merdeka No.1");
			expect(result.notes).toBe("Regular customer");
			expect(result.userId).toBeNull();
			expect(result.isActive).toBe(true);
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it("should create a customer with minimal fields", () => {
			const cmd = {
				fullName: "Jane Doe",
				phone: "08198765432",
			};
			const result = CustomerModule.create(businessId, cmd);

			expect(result.fullName).toBe("Jane Doe");
			expect(result.phone).toBe("08198765432");
			expect(result.email).toBeNull();
			expect(result.address).toBeNull();
			expect(result.notes).toBeNull();
		});
	});

	describe("update", () => {
		const existing: ICustomer = {
			id: generateId() as TCustomerId,
			businessId,
			userId: null,
			fullName: "Old Name",
			phone: "0811111111",
			email: "old@example.com",
			address: "Jl. Lama",
			notes: "Old notes",
			isActive: true,
			createdAt: new Date("2026-01-01"),
			updatedAt: new Date("2026-01-01"),
		};

		it("should update provided fields and keep others", () => {
			const cmd = { id: existing.id, fullName: "New Name" };
			const result = Effect.runSync(CustomerModule.update(existing, cmd));

			expect(result.fullName).toBe("New Name");
			expect(result.phone).toBe("0811111111");
			expect(result.email).toBe("old@example.com");
			expect(result.isActive).toBe(true);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it("should set nullable fields to null when explicitly passed as null", () => {
			const cmd = {
				id: existing.id,
				email: null,
				address: null,
				notes: null,
			};
			const result = Effect.runSync(CustomerModule.update(existing, cmd));

			expect(result.email).toBeNull();
			expect(result.address).toBeNull();
			expect(result.notes).toBeNull();
		});

		it("should keep existing nullable fields when not in command", () => {
			const cmd = { id: existing.id, fullName: "Partial Update" };
			const result = Effect.runSync(CustomerModule.update(existing, cmd));

			expect(result.fullName).toBe("Partial Update");
			expect(result.email).toBe("old@example.com");
			expect(result.address).toBe("Jl. Lama");
			expect(result.notes).toBe("Old notes");
		});

		it("should update isActive to false", () => {
			const cmd = { id: existing.id, isActive: false };
			const result = Effect.runSync(CustomerModule.update(existing, cmd));

			expect(result.isActive).toBe(false);
		});
	});

	describe("reconstitute", () => {
		it("should return the same object", () => {
			const raw: ICustomer = {
				id: generateId() as TCustomerId,
				businessId,
				userId: null,
				fullName: "Reconstituted",
				phone: "0812222222",
				email: null,
				address: null,
				notes: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const result = CustomerModule.reconstitute(raw);

			expect(result).toEqual(raw);
			expect(result).not.toBe(raw); // shallow copy
		});
	});
});
