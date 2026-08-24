import { describe, expect, it } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { PortalModule } from "./portal.module";
import type { TPortalConfig } from "./portal.types";

const tenantId = generateId<TTenantId>();

const existingConfig: TPortalConfig = {
	id: generateId(),
	tenantId,
	slug: "my-pet-shop",
	isActive: true,
	bookingEnabled: true,
	loginEnabled: true,
	guestBooking: false,
	depositRequired: true,
	depositAmount: 50_000,
	logoUrl: null,
};

describe("PortalModule", () => {
	describe("defaultConfig", () => {
		it("should return config with default values", () => {
			const config = PortalModule.defaultConfig(tenantId);

			expect(config.tenantId).toBe(tenantId);
			expect(config.slug).toBe("");
			expect(config.isActive).toBe(false);
			expect(config.bookingEnabled).toBe(true);
			expect(config.loginEnabled).toBe(true);
			expect(config.guestBooking).toBe(false);
			expect(config.depositRequired).toBe(true);
			expect(config.depositAmount).toBe(0);
		});
	});

	describe("mergeConfig", () => {
		it("should merge overrides into existing config", () => {
			const result = PortalModule.mergeConfig(existingConfig, {
				slug: "new-slug",
				depositAmount: 100_000,
			});

			expect(result.slug).toBe("new-slug");
			expect(result.depositAmount).toBe(100_000);
			expect(result.isActive).toBe(true); // unchanged
			expect(result.bookingEnabled).toBe(true); // unchanged
		});

		it("should create new config from overrides when existing is null", () => {
			const result = PortalModule.mergeConfig(null, {
				tenantId,
				slug: "fresh",
				isActive: true,
			});

			expect(result.tenantId).toBe(tenantId);
			expect(result.slug).toBe("fresh");
			expect(result.isActive).toBe(true);
			expect(result.id).toBeDefined();
		});

		it("should fill defaults with null existing", () => {
			const result = PortalModule.mergeConfig(null, { tenantId });

			expect(result.slug).toBe("");
			expect(result.isActive).toBe(false);
			expect(result.bookingEnabled).toBe(true);
		});

		it("should use existing values when overrides are undefined", () => {
			const result = PortalModule.mergeConfig(existingConfig, { tenantId });

			expect(result.slug).toBe("my-pet-shop");
			expect(result.isActive).toBe(true);
			expect(result.depositAmount).toBe(50_000);
		});

		it("should merge a logoUrl override", () => {
			const result = PortalModule.mergeConfig(existingConfig, {
				logoUrl:
					"https://ember.treonstudio.com/o/org-1/portal-assets/tenant-1/logo.png",
			});

			expect(result.logoUrl).toBe(
				"https://ember.treonstudio.com/o/org-1/portal-assets/tenant-1/logo.png",
			);
		});

		it("should default logoUrl to null when there is no existing config", () => {
			const result = PortalModule.mergeConfig(null, { tenantId });
			expect(result.logoUrl).toBeNull();
		});
	});

	describe("createBooking", () => {
		const scheduledAt = new Date("2026-07-15T10:00:00Z");

		it("should create a booking with pending status", () => {
			const booking = PortalModule.createBooking({
				idempotencyKey: "portal-module-booking-1",
				businessId: tenantId,
				branchId: "branch-1",
				customerName: "Alice",
				customerPhone: "08123456789",
				petName: "Buddy",
				scheduledAt,
			});

			expect(booking.status).toBe("pending");
			expect(booking.customerName).toBe("Alice");
			expect(booking.petName).toBe("Buddy");
			expect(booking.tenantId).toBe(tenantId);
			expect(booking.id).toBeDefined();
			expect(booking.createdAt).toBeInstanceOf(Date);
		});

		it("should handle optional fields as null", () => {
			const booking = PortalModule.createBooking({
				idempotencyKey: "portal-module-booking-2",
				businessId: tenantId,
				branchId: "branch-1",
				customerName: "Bob",
				customerPhone: "08111111111",
				petName: "Kitty",
				scheduledAt: new Date(),
			});

			expect(booking.branchId).toBe("branch-1");
			expect(booking.serviceId).toBeNull();
			expect(booking.roomId).toBeNull();
			expect(booking.boardingId).toBeNull();
			expect(booking.customerEmail).toBeNull();
			expect(booking.petSpecies).toBeNull();
			expect(booking.petBreed).toBeNull();
			expect(booking.estimatedCheckOutAt).toBeNull();
			expect(booking.notes).toBeNull();
		});

		it("should include optional fields when provided", () => {
			const booking = PortalModule.createBooking({
				idempotencyKey: "portal-module-booking-3",
				businessId: tenantId,
				branchId: "branch-1",
				serviceId: "service-1",
				roomId: "room-1",
				customerName: "Charlie",
				customerPhone: "08222222222",
				customerEmail: "charlie@test.com",
				petName: "Max",
				petSpecies: "dog",
				petBreed: "Labrador",
				scheduledAt,
				estimatedCheckOutAt: new Date("2026-07-17T10:00:00Z"),
				notes: "Please give bath",
			});

			expect(booking.branchId).toBe("branch-1");
			expect(booking.serviceId).toBe("service-1");
			expect(booking.roomId).toBe("room-1");
			expect(booking.customerEmail).toBe("charlie@test.com");
			expect(booking.petSpecies).toBe("dog");
			expect(booking.petBreed).toBe("Labrador");
			expect(booking.estimatedCheckOutAt).toEqual(
				new Date("2026-07-17T10:00:00Z"),
			);
			expect(booking.notes).toBe("Please give bath");
		});
	});

	describe("reconstitute", () => {
		it("should return a shallow copy of the object", () => {
			const obj = { foo: "bar" };
			const result = PortalModule.reconstitute(obj);
			expect(result).toEqual(obj);
			expect(result).not.toBe(obj);
		});
	});
});
