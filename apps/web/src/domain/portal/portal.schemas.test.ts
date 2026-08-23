import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
	CreatePortalServiceSchema,
	UpdatePortalConfigSchema,
} from "./portal.schemas";

describe("CreatePortalServiceSchema category validation", () => {
	const basePayload = {
		name: "Instalasi Aquascape Custom",
		description: "Jasa desain & pasang aquascape sesuai request.",
		durationMinutes: 120,
		price: 350000,
	};

	it("accepts a valid category", () => {
		expect(() =>
			Schema.decodeUnknownSync(CreatePortalServiceSchema)({
				...basePayload,
				category: "freshwater",
			}),
		).not.toThrow();
	});

	it("accepts a missing category (optional)", () => {
		expect(() =>
			Schema.decodeUnknownSync(CreatePortalServiceSchema)(basePayload),
		).not.toThrow();
	});

	it("rejects an invalid category value", () => {
		expect(() =>
			Schema.decodeUnknownSync(CreatePortalServiceSchema)({
				...basePayload,
				category: "reptile",
			}),
		).toThrow();
	});
});

describe("UpdatePortalConfigSchema logoUrl", () => {
	it("accepts a logoUrl string", () => {
		expect(() =>
			Schema.decodeUnknownSync(UpdatePortalConfigSchema)({
				logoUrl:
					"https://ember.treonstudio.com/o/org-1/portal-assets/tenant-1/logo.png",
			}),
		).not.toThrow();
	});

	it("accepts a null logoUrl", () => {
		expect(() =>
			Schema.decodeUnknownSync(UpdatePortalConfigSchema)({ logoUrl: null }),
		).not.toThrow();
	});

	it("accepts a missing logoUrl (optional)", () => {
		expect(() =>
			Schema.decodeUnknownSync(UpdatePortalConfigSchema)({}),
		).not.toThrow();
	});
});
