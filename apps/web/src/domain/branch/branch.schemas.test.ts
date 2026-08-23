import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { BranchSchema } from "./branch.schemas";

const validPayload = {
	name: "Cabang Pramuka",
	address: null,
	phone: null,
	email: "cs@himajinhobby.com",
	whatsappNumber: "+6281234567890",
	streetAddress: "Jl. Pramuka Raya No. 123",
	addressLocality: "Banjarmasin",
	addressRegion: "Kalimantan Selatan",
	postalCode: "70123",
	addressCountry: "ID",
	latitude: -3.3186,
	longitude: 114.5944,
	operatingHours: null,
};

describe("BranchSchema", () => {
	it("accepts a valid payload", () => {
		expect(() =>
			Schema.decodeUnknownSync(BranchSchema)(validPayload),
		).not.toThrow();
	});

	it("rejects an invalid email", () => {
		expect(() =>
			Schema.decodeUnknownSync(BranchSchema)({
				...validPayload,
				email: "not-an-email",
			}),
		).toThrow();
	});

	it("rejects out-of-range latitude", () => {
		expect(() =>
			Schema.decodeUnknownSync(BranchSchema)({
				...validPayload,
				latitude: 200,
			}),
		).toThrow();
	});

	it("rejects a malformed operating-hours time string", () => {
		expect(() =>
			Schema.decodeUnknownSync(BranchSchema)({
				...validPayload,
				operatingHours: {
					monday: { opens: "8am", closes: "21:00", isClosed: false },
					tuesday: { opens: "08:00", closes: "21:00", isClosed: false },
					wednesday: { opens: "08:00", closes: "21:00", isClosed: false },
					thursday: { opens: "08:00", closes: "21:00", isClosed: false },
					friday: { opens: "08:00", closes: "21:00", isClosed: false },
					saturday: { opens: "08:00", closes: "21:00", isClosed: false },
					sunday: { opens: "08:00", closes: "21:00", isClosed: false },
				},
			}),
		).toThrow();
	});
});
