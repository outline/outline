// @vitest-environment node
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createBranchHolidayProgram,
	createBranchProgram,
	deleteBranchProgram,
	getBranchesProgram,
	getBranchHolidaysProgram,
	toggleBranchStatusProgram,
	updateBranchProgram,
} from "./branch.programs";
import { IBranchRepository } from "./branch.repository";
import type {
	TBranch,
	TBranchHoliday,
	TBranchHolidayId,
	TBranchId,
} from "./branch.types";

describe("BranchPrograms", () => {
	const tenantId = generateId<TTenantId>();

	describe("getBranchesProgram", () => {
		it("should call findAll and return mapped DTOs", async () => {
			const branch: TBranch = {
				id: "branch-1" as TBranchId,
				tenantId,
				name: "South Branch",
				address: "Jl. South No.1",
				phone: "021-12345",
				isActive: true,
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
				createdAt: new Date("2026-06-01"),
				updatedAt: new Date("2026-06-01"),
			};
			const findAll = vi.fn().mockReturnValue(Effect.succeed([branch]));
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll,
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const program = getBranchesProgram(tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("South Branch");
			expect(result[0]?.isActive).toBe(true);
			expect(result[0]?.createdAt).toBe("2026-06-01T00:00:00.000Z");
			expect(findAll).toHaveBeenCalledWith(tenantId);
		});

		it("should return empty array when no branches", async () => {
			const findAll = vi.fn().mockReturnValue(Effect.succeed([]));
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll,
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const program = getBranchesProgram(tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toHaveLength(0);
		});

		it("should propagate DatabaseError", async () => {
			const findAll = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll,
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const program = getBranchesProgram(tenantId);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("createBranchProgram", () => {
		it("should create branch, save, add member, and return DTO", async () => {
			const createBranch = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll: vi.fn(),
				createBranch,
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const command = {
				name: "East Branch",
				address: "Jl. East No.2",
				phone: "021-67890",
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
			};
			const userId = "user-1";

			const program = createBranchProgram(command, tenantId, userId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.name).toBe("East Branch");
			expect(result.isActive).toBe(true);
			expect(createBranch).toHaveBeenCalledOnce();
		});

		it("should propagate DatabaseError when createBranch fails", async () => {
			const createBranch = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll: vi.fn(),
				createBranch,
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const command = {
				name: "Fail Branch",
				address: null,
				phone: null,
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
			};

			const program = createBranchProgram(command, tenantId, "user-1");
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("updateBranchProgram", () => {
		it("should find existing branch, update, and call repo.update", async () => {
			const existingBranch: TBranch = {
				id: "branch-1" as TBranchId,
				tenantId,
				name: "Old Name",
				address: "Jl. Old",
				phone: "021-old",
				isActive: true,
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
				createdAt: new Date("2026-01-01"),
				updatedAt: new Date("2026-01-01"),
			};
			const findById = vi.fn().mockReturnValue(Effect.succeed(existingBranch));
			const update = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById,
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update,
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const command = {
				id: "branch-1",
				name: "New Name",
				address: "Jl. New",
				phone: "021-new",
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
			};

			const program = updateBranchProgram(command, tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toBeUndefined();
			expect(findById).toHaveBeenCalledWith("branch-1" as TBranchId, tenantId);
			expect(update).toHaveBeenCalledOnce();
			const updatedBranch = update.mock.calls[0]?.[0] as TBranch;
			expect(updatedBranch.name).toBe("New Name");
		});

		it("should fail with BranchNotFoundError when branch does not exist", async () => {
			const findById = vi.fn().mockReturnValue(Effect.succeed(null));
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById,
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const command = {
				id: "branch-nonexistent",
				name: "Ghost",
				address: null,
				phone: null,
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
			};

			const program = updateBranchProgram(command, tenantId);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toMatchObject({
				name: expect.stringContaining("BranchNotFoundError"),
			});
		});
	});

	describe("toggleBranchStatusProgram", () => {
		it("should update branch isActive status", async () => {
			const existingBranch: TBranch = {
				id: "branch-1" as TBranchId,
				tenantId,
				name: "Branch",
				address: null,
				phone: null,
				isActive: true,
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const findById = vi.fn().mockReturnValue(Effect.succeed(existingBranch));
			const update = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById,
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update,
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const command = { id: "branch-1", isActive: false };
			const program = toggleBranchStatusProgram(command, tenantId);
			await Effect.runPromise(Effect.provide(program, TestLayer));

			const updatedBranch = update.mock.calls[0]?.[0] as TBranch;
			expect(updatedBranch.isActive).toBe(false);
		});

		it("should fail with BranchNotFoundError when branch does not exist", async () => {
			const findById = vi.fn().mockReturnValue(Effect.succeed(null));
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById,
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const command = { id: "branch-ghost", isActive: true };
			const program = toggleBranchStatusProgram(command, tenantId);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toMatchObject({
				name: expect.stringContaining("BranchNotFoundError"),
			});
		});
	});

	describe("deleteBranchProgram", () => {
		it("should deactivate the branch (soft delete)", async () => {
			const existingBranch: TBranch = {
				id: "branch-1" as TBranchId,
				tenantId,
				name: "Branch",
				address: null,
				phone: null,
				isActive: true,
				email: null,
				whatsappNumber: null,
				streetAddress: null,
				addressLocality: null,
				addressRegion: null,
				postalCode: null,
				addressCountry: null,
				latitude: null,
				longitude: null,
				operatingHours: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const findById = vi.fn().mockReturnValue(Effect.succeed(existingBranch));
			const update = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById,
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update,
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const program = deleteBranchProgram("branch-1", tenantId);
			await Effect.runPromise(Effect.provide(program, TestLayer));

			const updatedBranch = update.mock.calls[0]?.[0] as TBranch;
			expect(updatedBranch.isActive).toBe(false);
		});

		it("should fail with BranchNotFoundError", async () => {
			const findById = vi.fn().mockReturnValue(Effect.succeed(null));
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById,
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const program = deleteBranchProgram("branch-ghost", tenantId);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toMatchObject({
				name: expect.stringContaining("BranchNotFoundError"),
			});
		});
	});

	describe("getBranchHolidaysProgram", () => {
		it("should call findHolidays and return holidays", async () => {
			const holiday: TBranchHoliday = {
				id: "holiday-1" as TBranchHolidayId,
				branchId: "branch-1" as TBranchId,
				tenantId,
				name: "New Year",
				date: new Date("2026-01-01"),
				isRecurring: true,
				createdAt: new Date(),
			};
			const findHolidays = vi.fn().mockReturnValue(Effect.succeed([holiday]));
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays,
				saveHoliday: vi.fn(),
				deleteHoliday: vi.fn(),
			});

			const program = getBranchHolidaysProgram("branch-1", tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("New Year");
			expect(result[0]?.isRecurring).toBe(true);
		});
	});

	describe("createBranchHolidayProgram", () => {
		it("should save holiday and return it", async () => {
			const saveHoliday = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday,
				deleteHoliday: vi.fn(),
			});

			const command = {
				branchId: "branch-1",
				name: "Independence Day",
				date: new Date("2026-08-17"),
				isRecurring: true,
			};

			const program = createBranchHolidayProgram(command, tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.name).toBe("Independence Day");
			expect(result.isRecurring).toBe(true);
			expect(result.branchId).toBe("branch-1");
			expect(saveHoliday).toHaveBeenCalledOnce();
		});

		it("should default isRecurring to false when not provided", async () => {
			const saveHoliday = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(IBranchRepository, {
				findById: vi.fn(),
				findAll: vi.fn(),
				createBranch: vi.fn(),
				update: vi.fn(),
				findHolidays: vi.fn(),
				saveHoliday,
				deleteHoliday: vi.fn(),
			});

			const command = {
				branchId: "branch-1",
				name: "Special Day",
				date: new Date("2026-12-25"),
			};

			const program = createBranchHolidayProgram(command, tenantId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.isRecurring).toBe(false);
		});
	});
});
