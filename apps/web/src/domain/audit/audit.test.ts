import { describe, expect, it } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { AuditModule } from "./audit.module";
import type { TAuditLog, TAuditLogId } from "./audit.types";

describe("AuditModule", () => {
	const tenantId = "business-1" as TTenantId;
	const userId = "user-1" as TUserId;

	describe("create", () => {
		it("should create an audit log with generated id and timestamp", () => {
			const log = AuditModule.create({
				tenantId,
				userId,
				action: "update",
				entityType: "boarding",
				entityId: "boarding-123",
				oldValue: { status: "draft" },
				newValue: { status: "active" },
				ipAddress: "192.168.1.1",
				userAgent: "Mozilla/5.0",
			});

			expect(log.id).toBeDefined();
			expect(log.tenantId).toBe(tenantId);
			expect(log.userId).toBe(userId);
			expect(log.action).toBe("update");
			expect(log.entityType).toBe("boarding");
			expect(log.entityId).toBe("boarding-123");
			expect(log.oldValue).toEqual({ status: "draft" });
			expect(log.newValue).toEqual({ status: "active" });
			expect(log.ipAddress).toBe("192.168.1.1");
			expect(log.userAgent).toBe("Mozilla/5.0");
			expect(log.createdAt).toBeInstanceOf(Date);
		});

		it("should handle null values for optional fields", () => {
			const log = AuditModule.create({
				tenantId,
				userId,
				action: "delete",
				entityType: "customer",
				entityId: null,
				oldValue: null,
				newValue: null,
				ipAddress: null,
				userAgent: null,
			});

			expect(log.entityId).toBeNull();
			expect(log.oldValue).toBeNull();
			expect(log.newValue).toBeNull();
			expect(log.ipAddress).toBeNull();
			expect(log.userAgent).toBeNull();
		});

		it("should generate unique ids for consecutive calls", () => {
			const log1 = AuditModule.create({
				tenantId,
				userId,
				action: "create",
				entityType: "boarding",
				entityId: "b-1",
				oldValue: null,
				newValue: null,
				ipAddress: null,
				userAgent: null,
			});
			const log2 = AuditModule.create({
				tenantId,
				userId,
				action: "create",
				entityType: "boarding",
				entityId: "b-2",
				oldValue: null,
				newValue: null,
				ipAddress: null,
				userAgent: null,
			});

			expect(log1.id).not.toBe(log2.id);
		});
	});

	describe("reconstitute", () => {
		it("should return the same audit log object", () => {
			const log: TAuditLog = {
				id: "audit-123" as TAuditLogId,
				tenantId,
				userId,
				action: "login",
				entityType: "session",
				entityId: null,
				oldValue: null,
				newValue: null,
				ipAddress: "10.0.0.1",
				userAgent: "curl/7.68.0",
				createdAt: new Date("2026-06-20"),
			};

			const result = AuditModule.reconstitute(log);
			expect(result).toEqual(log);
		});
	});
});
