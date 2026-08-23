import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { getAuditLogsProgram, logAuditEventProgram } from "./audit.programs";
import { IAuditRepository } from "./audit.repository";
import type { TAuditLog, TAuditLogId } from "./audit.types";

describe("AuditPrograms", () => {
	const tenantId = generateId<TTenantId>();
	const userId = generateId<TUserId>();

	describe("getAuditLogsProgram", () => {
		it("should call repo.findAll and return mapped logs with total", async () => {
			const rawLog: TAuditLog = {
				id: "audit-1" as TAuditLogId,
				tenantId,
				userId,
				action: "update",
				entityType: "boarding",
				entityId: "b-1",
				oldValue: null,
				newValue: { status: "active" },
				ipAddress: null,
				userAgent: null,
				createdAt: new Date("2026-06-20"),
			};

			const findAll = vi
				.fn()
				.mockReturnValue(Effect.succeed({ logs: [rawLog], total: 1 }));

			const repoLayer = Layer.succeed(IAuditRepository, {
				findAll,
				save: vi.fn(),
				getStats: vi.fn(),
			});

			const filter = {};
			const program = getAuditLogsProgram(tenantId, filter);
			const result = await Effect.runPromise(
				Effect.provide(program, repoLayer),
			);

			expect(result.total).toBe(1);
			expect(result.logs).toHaveLength(1);
			expect(result.logs[0]?.action).toBe("update");
			expect(result.logs[0]?.entityType).toBe("boarding");
			expect(findAll).toHaveBeenCalledWith(tenantId, filter);
		});

		it("should propagate DatabaseError", async () => {
			const findAll = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);

			const repoLayer = Layer.succeed(IAuditRepository, {
				findAll,
				save: vi.fn(),
				getStats: vi.fn(),
			});

			const program = getAuditLogsProgram(tenantId, {});
			await expect(
				Effect.runPromise(Effect.provide(program, repoLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("logAuditEventProgram", () => {
		it("should create an audit log and call repo.save", async () => {
			const save = vi.fn().mockReturnValue(Effect.void);

			const repoLayer = Layer.succeed(IAuditRepository, {
				findAll: vi.fn(),
				save,
				getStats: vi.fn(),
			});

			const program = logAuditEventProgram(
				tenantId,
				userId,
				"boarding.create",
				"boarding",
				"b-123",
				null,
				{ name: "Fluffy" },
				"192.168.1.1",
				"test-agent",
			);
			const result = await Effect.runPromise(
				Effect.provide(program, repoLayer),
			);

			expect(result).toBeUndefined();
			expect(save).toHaveBeenCalledOnce();
			const savedLog = save.mock.calls[0]?.[0] as TAuditLog;
			expect(savedLog.action).toBe("boarding.create");
			expect(savedLog.entityType).toBe("boarding");
			expect(savedLog.entityId).toBe("b-123");
			expect(savedLog.newValue).toEqual({ name: "Fluffy" });
			expect(savedLog.ipAddress).toBe("192.168.1.1");
			expect(savedLog.userAgent).toBe("test-agent");
			expect(savedLog.id).toBeDefined();
			expect(savedLog.createdAt).toBeInstanceOf(Date);
		});

		it("should propagate DatabaseError when save fails", async () => {
			const save = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);

			const repoLayer = Layer.succeed(IAuditRepository, {
				findAll: vi.fn(),
				save,
				getStats: vi.fn(),
			});

			const program = logAuditEventProgram(
				tenantId,
				userId,
				"boarding.delete",
				"boarding",
				"b-123",
				{ name: "Fluffy" },
				null,
				null,
				null,
			);
			await expect(
				Effect.runPromise(Effect.provide(program, repoLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});
});
