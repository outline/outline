import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	getStaffMembersProgram,
	inviteStaffProgram,
	removeStaffFromBranchProgram,
} from "./staff.programs";
import { IStaffRepository } from "./staff.repository";
import { IBranchRepository } from "@/domain/branch";
import { IEmailPort } from "@/shared/ports/email.port";

const tenantId = generateId() as TTenantId;

const mockMembers = [
	{
		userId: "user-1" as TUserId,
		fullName: "John Doe",
		email: "john@example.com",
		role: "kasir" as const,
		branches: [{ id: "branch-1", name: "Main Branch" }],
	},
];

describe("getStaffMembersProgram", () => {
	it("returns staff members as DTOs", async () => {
		const findAll = vi.fn().mockReturnValue(Effect.succeed(mockMembers));
		const TestLayer = Layer.succeed(IStaffRepository, {
			findAll,
			findUserIdByEmail: vi.fn(),
			inviteStaff: vi.fn(),
			removeFromBranch: vi.fn(),
		});

		const result = await Effect.runPromise(
			Effect.provide(getStaffMembersProgram(tenantId), TestLayer),
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.fullName).toBe("John Doe");
		expect(result[0]?.email).toBe("john@example.com");
		expect(result[0]?.role).toBe("kasir");
		expect(result[0]?.branches[0]?.name).toBe("Main Branch");
		expect(findAll).toHaveBeenCalledWith(tenantId);
	});

	it("returns empty array when no staff", async () => {
		const findAll = vi.fn().mockReturnValue(Effect.succeed([]));
		const TestLayer = Layer.succeed(IStaffRepository, {
			findAll,
			findUserIdByEmail: vi.fn(),
			inviteStaff: vi.fn(),
			removeFromBranch: vi.fn(),
		});

		const result = await Effect.runPromise(
			Effect.provide(getStaffMembersProgram(tenantId), TestLayer),
		);

		expect(result).toHaveLength(0);
	});

	it("propagates DatabaseError", async () => {
		const TestLayer = Layer.succeed(IStaffRepository, {
			findAll: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
			findUserIdByEmail: vi.fn(),
			inviteStaff: vi.fn(),
			removeFromBranch: vi.fn(),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(getStaffMembersProgram(tenantId), TestLayer),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("inviteStaffProgram", () => {
	const command = {
		email: "newstaff@example.com",
		branchId: "branch-1",
		role: "kasir" as const,
	};

	it("invites a registered user by email and sends an access-granted email", async () => {
		const findUserIdByEmail = vi
			.fn()
			.mockReturnValue(Effect.succeed("user-2" as TUserId));
		const inviteStaff = vi.fn().mockReturnValue(Effect.void);
		const staffLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail,
			inviteStaff,
			removeFromBranch: vi.fn(),
		});

		const findBranchById = vi
			.fn()
			.mockReturnValue(
				Effect.succeed({ id: "branch-1", name: "Cabang Pramuka" }),
			);
		const branchLayer = Layer.succeed(IBranchRepository, {
			findById: findBranchById,
			findAll: vi.fn(),
			createBranch: vi.fn(),
			update: vi.fn(),
			findHolidays: vi.fn(),
			saveHoliday: vi.fn(),
			deleteHoliday: vi.fn(),
		});

		const sendEmail = vi.fn().mockReturnValue(Effect.void);
		const emailLayer = Layer.succeed(IEmailPort, { sendEmail });

		const result = await Effect.runPromise(
			Effect.provide(
				inviteStaffProgram(command, tenantId),
				Layer.mergeAll(staffLayer, branchLayer, emailLayer),
			),
		);

		expect(result).toBeUndefined();
		expect(findUserIdByEmail).toHaveBeenCalledWith("newstaff@example.com");
		expect(inviteStaff).toHaveBeenCalledWith(
			{
				userId: "user-2" as TUserId,
				branchId: "branch-1",
				role: "kasir",
			},
			tenantId,
		);
		expect(findBranchById).toHaveBeenCalledWith("branch-1", tenantId);
		expect(sendEmail).toHaveBeenCalledTimes(1);
		const call = sendEmail.mock.calls[0];
		expect(call?.[0]).toBeDefined();
		expect(call?.[0].to).toBe("newstaff@example.com");
		expect(call?.[0].text).toContain("Cabang Pramuka");
	});

	it("REGRESSION: still succeeds when the branch lookup fails (invite already committed)", async () => {
		const findUserIdByEmail = vi
			.fn()
			.mockReturnValue(Effect.succeed("user-2" as TUserId));
		const inviteStaff = vi.fn().mockReturnValue(Effect.void);
		const staffLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail,
			inviteStaff,
			removeFromBranch: vi.fn(),
		});

		const branchLayer = Layer.succeed(IBranchRepository, {
			findById: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
			findAll: vi.fn(),
			createBranch: vi.fn(),
			update: vi.fn(),
			findHolidays: vi.fn(),
			saveHoliday: vi.fn(),
			deleteHoliday: vi.fn(),
		});

		const sendEmail = vi.fn().mockReturnValue(Effect.void);
		const emailLayer = Layer.succeed(IEmailPort, { sendEmail });

		const result = await Effect.runPromise(
			Effect.provide(
				inviteStaffProgram(command, tenantId),
				Layer.mergeAll(staffLayer, branchLayer, emailLayer),
			),
		);

		expect(result).toBeUndefined();
		expect(inviteStaff).toHaveBeenCalledTimes(1);
		expect(sendEmail).not.toHaveBeenCalled();
	});

	it("fails with UserNotRegisteredError when email not found", async () => {
		const staffLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail: vi.fn().mockReturnValue(Effect.succeed(null)),
			inviteStaff: vi.fn(),
			removeFromBranch: vi.fn(),
		});

		const branchLayer = Layer.succeed(IBranchRepository, {
			findById: vi.fn(),
			findAll: vi.fn(),
			createBranch: vi.fn(),
			update: vi.fn(),
			findHolidays: vi.fn(),
			saveHoliday: vi.fn(),
			deleteHoliday: vi.fn(),
		});

		const emailLayer = Layer.succeed(IEmailPort, { sendEmail: vi.fn() });

		await expect(
			Effect.runPromise(
				Effect.provide(
					inviteStaffProgram(command, tenantId),
					Layer.mergeAll(staffLayer, branchLayer, emailLayer),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("UserNotRegisteredError"),
		});
	});

	it("propagates DatabaseError from findUserIdByEmail", async () => {
		const staffLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
			inviteStaff: vi.fn(),
			removeFromBranch: vi.fn(),
		});

		const branchLayer = Layer.succeed(IBranchRepository, {
			findById: vi.fn(),
			findAll: vi.fn(),
			createBranch: vi.fn(),
			update: vi.fn(),
			findHolidays: vi.fn(),
			saveHoliday: vi.fn(),
			deleteHoliday: vi.fn(),
		});

		const emailLayer = Layer.succeed(IEmailPort, { sendEmail: vi.fn() });

		await expect(
			Effect.runPromise(
				Effect.provide(
					inviteStaffProgram(command, tenantId),
					Layer.mergeAll(staffLayer, branchLayer, emailLayer),
				),
			),
		).rejects.toThrow("DatabaseError");
	});

	it("propagates DatabaseError from inviteStaff", async () => {
		const staffLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail: vi
				.fn()
				.mockReturnValue(Effect.succeed("user-2" as TUserId)),
			inviteStaff: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
			removeFromBranch: vi.fn(),
		});

		const branchLayer = Layer.succeed(IBranchRepository, {
			findById: vi.fn(),
			findAll: vi.fn(),
			createBranch: vi.fn(),
			update: vi.fn(),
			findHolidays: vi.fn(),
			saveHoliday: vi.fn(),
			deleteHoliday: vi.fn(),
		});

		const emailLayer = Layer.succeed(IEmailPort, { sendEmail: vi.fn() });

		await expect(
			Effect.runPromise(
				Effect.provide(
					inviteStaffProgram(command, tenantId),
					Layer.mergeAll(staffLayer, branchLayer, emailLayer),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("removeStaffFromBranchProgram", () => {
	const tenantId = "tenant-1" as TTenantId;
	const command = {
		userId: "user-1",
		branchId: "branch-1",
	};

	it("removes a staff member from a branch", async () => {
		const removeFromBranch = vi.fn().mockReturnValue(Effect.void);
		const TestLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail: vi.fn(),
			inviteStaff: vi.fn(),
			removeFromBranch,
		});

		const result = await Effect.runPromise(
			Effect.provide(
				removeStaffFromBranchProgram(command, tenantId),
				TestLayer,
			),
		);

		expect(result).toBeUndefined();
		expect(removeFromBranch).toHaveBeenCalledWith(
			"user-1" as TUserId,
			"branch-1",
			tenantId,
		);
	});

	it("propagates DatabaseError", async () => {
		const TestLayer = Layer.succeed(IStaffRepository, {
			findAll: vi.fn(),
			findUserIdByEmail: vi.fn(),
			inviteStaff: vi.fn(),
			removeFromBranch: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					removeStaffFromBranchProgram(command, tenantId),
					TestLayer,
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});
