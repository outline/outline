import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { PetNotFoundError } from "./pet.errors";
import {
	addPetProgram,
	deletePetProgram,
	getPetByIdProgram,
	getPetsByCustomerProgram,
	getPetsProgram,
	updatePetProgram,
} from "./pet.programs";
import { PetRepository } from "./pet.repository";
import type { TPet, TPetId } from "./pet.types";

const tenantId = generateId<TTenantId>();

const basePet: TPet = {
	id: generateId<TPetId>(),
	tenantId,
	customerId: null,
	name: "Fluffy",
	species: "cat",
	breed: "Persian",
	gender: "female",
	birthDate: new Date("2023-01-01"),
	weightKg: 4.5,
	color: "White",
	isVaccinated: true,
	vaccineNotes: "Rabies shot done",
	allergies: null,
	medicalNotes: null,
	specialInstructions: null,
	photoUrl: null,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const makeMockRepo = (overrides?: Record<string, unknown>) => {
	const base = {
		findById: vi.fn(),
		findByCustomerId: vi.fn(),
		findAllActive: vi.fn(),
		save: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	};
	return { ...base, ...overrides } as Parameters<typeof PetRepository.of>[0];
};

const provideRepo = (mock: ReturnType<typeof makeMockRepo>) =>
	Layer.succeed(PetRepository, PetRepository.of(mock));

describe("PetPrograms", () => {
	describe("getPetsProgram", () => {
		it("should return all active pets", async () => {
			const mock = makeMockRepo({
				findAllActive: vi.fn(() => Effect.succeed([basePet])),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPetsProgram(tenantId), provideRepo(mock)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Fluffy");
			expect(mock.findAllActive).toHaveBeenCalledWith(tenantId);
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const mock = makeMockRepo({
				findAllActive: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(getPetsProgram(tenantId), provideRepo(mock)),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("getPetsByCustomerProgram", () => {
		it("should return pets for a customer", async () => {
			const customerId =
				generateId() as import("@/domain/customer/customer.types").TCustomerId;
			const customerPet = { ...basePet, customerId };
			const mock = makeMockRepo({
				findByCustomerId: vi.fn(() => Effect.succeed([customerPet])),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					getPetsByCustomerProgram(tenantId, customerId),
					provideRepo(mock),
				),
			);

			expect(result).toHaveLength(1);
			expect(mock.findByCustomerId).toHaveBeenCalledWith(customerId, tenantId);
		});
	});

	describe("getPetByIdProgram", () => {
		it("should return a pet by id", async () => {
			const mock = makeMockRepo({
				findById: vi.fn(() => Effect.succeed(basePet)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					getPetByIdProgram(tenantId, basePet.id),
					provideRepo(mock),
				),
			);

			expect(result.id).toBe(basePet.id);
			expect(mock.findById).toHaveBeenCalledWith(basePet.id, tenantId);
		});

		it("should propagate PetNotFoundError", async () => {
			const notFoundErr = new PetNotFoundError({ id: "nonexistent" });
			const mock = makeMockRepo({
				findById: vi.fn(() => Effect.fail(notFoundErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						getPetByIdProgram(tenantId, "nonexistent" as TPetId),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("PetNotFoundError"),
			});
		});
	});

	describe("addPetProgram", () => {
		it("should decode and create a pet", async () => {
			const mock = makeMockRepo({
				save: vi.fn(() => Effect.succeed(basePet)),
			});

			const data = {
				customerId: null,
				name: "Fluffy",
				species: "cat" as const,
				breed: "Persian",
				gender: "female" as const,
				birthDate: "2023-01-01T00:00:00.000Z",
				weightKg: 4.5,
				color: "White",
				isVaccinated: true,
				vaccineNotes: "Rabies shot done",
				allergies: null,
				medicalNotes: null,
				specialInstructions: null,
				photoUrl: null,
			};

			const result = await Effect.runPromise(
				Effect.provide(addPetProgram(tenantId, data), provideRepo(mock)),
			);

			expect(result.name).toBe("Fluffy");
			expect(mock.save).toHaveBeenCalledTimes(1);
		});

		it("should fail on invalid schema", async () => {
			const mock = makeMockRepo();

			await expect(
				Effect.runPromise(
					Effect.provide(
						addPetProgram(tenantId, { name: "" }), // empty name
						provideRepo(mock),
					),
				),
			).rejects.toThrow();
		});
	});

	describe("updatePetProgram", () => {
		it("should decode update data and update the pet", async () => {
			const mock = makeMockRepo({
				update: vi.fn(() => Effect.succeed(basePet)),
			});

			const data = { id: basePet.id, name: "Max", species: "dog" as const };
			const result = await Effect.runPromise(
				Effect.provide(updatePetProgram(tenantId, data), provideRepo(mock)),
			);

			expect(result.name).toBe("Fluffy");
			expect(mock.update).toHaveBeenCalledTimes(1);
		});

		it("should propagate PetNotFoundError", async () => {
			const notFoundErr = new PetNotFoundError({ id: "nonexistent" });
			const mock = makeMockRepo({
				update: vi.fn(() => Effect.fail(notFoundErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						updatePetProgram(tenantId, { id: "nonexistent" }),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("PetNotFoundError"),
			});
		});
	});

	describe("deletePetProgram", () => {
		it("should delete a pet by id", async () => {
			const mock = makeMockRepo({
				delete: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					deletePetProgram(tenantId, basePet.id),
					provideRepo(mock),
				),
			);

			expect(mock.delete).toHaveBeenCalledWith(basePet.id, tenantId);
		});

		it("should propagate PetNotFoundError", async () => {
			const notFoundErr = new PetNotFoundError({ id: "nonexistent" });
			const mock = makeMockRepo({
				delete: vi.fn(() => Effect.fail(notFoundErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						deletePetProgram(tenantId, "nonexistent" as TPetId),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("PetNotFoundError"),
			});
		});
	});
});
