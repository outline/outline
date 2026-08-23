import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { createPet, updatePetData } from "./pet.module";

const tenantId = generateId<TTenantId>();

const createPetData = {
	customerId: null,
	name: "Fluffy",
	species: "cat" as const,
	breed: "Persian",
	gender: "female" as const,
	birthDate: new Date("2023-01-01"),
	weightKg: 4.5,
	color: "White",
	isVaccinated: true,
	vaccineNotes: "Rabies shot done",
	allergies: null,
	medicalNotes: null,
	specialInstructions: null,
	photoUrl: null,
};

describe("PetModule", () => {
	describe("createPet", () => {
		it("should create a valid pet entity", () => {
			const result = Effect.runSync(createPet(tenantId, createPetData));

			expect(result.name).toBe("Fluffy");
			expect(result.species).toBe("cat");
			expect(result.breed).toBe("Persian");
			expect(result.tenantId).toBe(tenantId);
			expect(result.isActive).toBe(true);
		});

		it("should set isActive to true by default", () => {
			const data = { ...createPetData };
			const result = Effect.runSync(createPet(tenantId, data));
			expect(result.isActive).toBe(true);
		});

		it("should handle null customerId", () => {
			const data = { ...createPetData, customerId: null };
			const result = Effect.runSync(createPet(tenantId, data));
			expect(result.customerId).toBeNull();
		});

		it("should handle all nullable fields as null", () => {
			const data = {
				customerId: null,
				name: "Test",
				species: "dog" as const,
				breed: null,
				gender: null,
				birthDate: null,
				weightKg: null,
				color: null,
				isVaccinated: false,
				vaccineNotes: null,
				allergies: null,
				medicalNotes: null,
				specialInstructions: null,
				photoUrl: null,
			};
			const result = Effect.runSync(createPet(tenantId, data));

			expect(result.breed).toBeNull();
			expect(result.gender).toBeNull();
			expect(result.birthDate).toBeNull();
			expect(result.weightKg).toBeNull();
			expect(result.color).toBeNull();
			expect(result.isVaccinated).toBe(false);
		});
	});

	describe("updatePetData", () => {
		it("should return partial updates for name", () => {
			const updates = Effect.runSync(
				updatePetData({ id: generateId(), name: "Max" }),
			);
			expect(updates.name).toBe("Max");
		});

		it("should return partial updates for species", () => {
			const updates = Effect.runSync(
				updatePetData({ id: generateId(), species: "dog" }),
			);
			expect(updates.species).toBe("dog");
		});

		it("should return partial updates for isActive", () => {
			const updates = Effect.runSync(
				updatePetData({ id: generateId(), isActive: false }),
			);
			expect(updates.isActive).toBe(false);
		});

		it("should omit undefined fields from updates", () => {
			const updates = Effect.runSync(
				updatePetData({ id: generateId(), name: "Max" }),
			);
			expect(updates).not.toHaveProperty("species");
			expect(updates).not.toHaveProperty("breed");
			expect(updates).not.toHaveProperty("gender");
			expect(updates).not.toHaveProperty("birthDate");
		});

		it("should handle setting a field to null", () => {
			const updates = Effect.runSync(
				updatePetData({ id: generateId(), breed: null }),
			);
			expect(updates.breed).toBeNull();
		});

		it("should handle customerId update", () => {
			const customerId = generateId();
			const updates = Effect.runSync(
				updatePetData({ id: generateId(), customerId }),
			);
			expect(updates.customerId).toBe(customerId);
		});
	});
});
