import { describe, expect, it } from "vitest";
import { AuditModule } from "./audit.module";

describe("AuditModule.create", () => {
	it("should create an audit log entry", () => {
		const log = AuditModule.create({
			tenantId: "tenant-1" as never,
			userId: "user-1" as never,
			action: "storage_upload",
			entityType: "file",
			entityId: "key-1",
			oldValue: null,
			newValue: { url: "https://example.com/file" },
			ipAddress: "127.0.0.1",
			userAgent: "test",
		});

		expect(log.id).toBeTruthy();
		expect(log.action).toBe("storage_upload");
		expect(log.entityType).toBe("file");
		expect(log.entityId).toBe("key-1");
		expect(log.ipAddress).toBe("127.0.0.1");
		expect(log.newValue).toEqual({ url: "https://example.com/file" });
		expect(log.createdAt).toBeInstanceOf(Date);
	});

	it("should handle null entityId", () => {
		const log = AuditModule.create({
			tenantId: "tenant-1" as never,
			userId: "user-1" as never,
			action: "password_reset_request",
			entityType: "user",
			entityId: null,
			oldValue: null,
			newValue: null,
			ipAddress: null,
			userAgent: null,
		});

		expect(log.action).toBe("password_reset_request");
		expect(log.entityId).toBeNull();
	});
});

describe("Audit event name conventions", () => {
	const eventNames = [
		"storage_upload",
		"storage_delete",
		"api_key_create",
		"api_key_update",
		"api_key_revoke",
		"password_reset_request",
		"password_reset_confirm",
		"queue_dlq",
		"order_created",
		"staff_invited",
	];

	it.each(eventNames)("should follow snake_case convention: %s", (name) => {
		expect(name).toMatch(/^[a-z]+_[a-z_]+$/);
	});
});
