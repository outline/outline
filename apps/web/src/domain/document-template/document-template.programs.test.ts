import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { generateId } from "@/shared/utils";
import {
	getTemplateByTypeProgram,
	upsertTemplateProgram,
} from "./document-template.programs";
import { IDocumentTemplateRepository } from "./document-template.repository";
import type { IDocumentTemplate } from "./document-template.types";

const businessId = generateId();
const templateId = generateId() as IDocumentTemplate["id"];

const mockTemplate: IDocumentTemplate = {
	id: templateId,
	businessId,
	type: "boarding_agreement",
	name: "Boarding Agreement",
	content: {
		title: "Boarding Agreement",
		header: "Pet Boarding Agreement",
		p1: "This agreement is entered into...",
		p2: "The pet owner agrees to...",
		p3: "The facility agrees to...",
		p4: "Cancellation policy...",
		footer: "Thank you for choosing our service",
		termsAndConditions: ["Pet must be vaccinated", "Payment due at drop-off"],
	},
	isActive: true,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
};

describe("getTemplateByTypeProgram", () => {
	it("should return template when found", async () => {
		const findByType = vi.fn().mockReturnValue(Effect.succeed(mockTemplate));
		const result = await Effect.runPromise(
			Effect.provide(
				getTemplateByTypeProgram(businessId, "boarding_agreement"),
				Layer.succeed(IDocumentTemplateRepository, {
					findByType,
					save: vi.fn(),
					update: vi.fn(),
				}),
			),
		);

		expect(result).toEqual(mockTemplate);
		expect(findByType).toHaveBeenCalledWith(businessId, "boarding_agreement");
	});

	it("should return null when template not found", async () => {
		const findByType = vi.fn().mockReturnValue(Effect.succeed(null));
		const result = await Effect.runPromise(
			Effect.provide(
				getTemplateByTypeProgram(businessId, "nonexistent"),
				Layer.succeed(IDocumentTemplateRepository, {
					findByType,
					save: vi.fn(),
					update: vi.fn(),
				}),
			),
		);

		expect(result).toBeNull();
	});

	it("should propagate DatabaseError", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					getTemplateByTypeProgram(businessId, "boarding_agreement"),
					Layer.succeed(IDocumentTemplateRepository, {
						findByType: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						save: vi.fn(),
						update: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("upsertTemplateProgram", () => {
	it("should save a new template when command has no id", async () => {
		const save = vi.fn().mockReturnValue(Effect.succeed(mockTemplate));
		const createCommand = {
			type: "boarding_agreement",
			name: "Boarding Agreement",
			content: {
				title: "Boarding Agreement",
				header: "Header",
				p1: "P1",
				p2: "P2",
				p3: "P3",
				p4: "P4",
				footer: "Footer",
				termsAndConditions: [],
			},
		};

		const result = await Effect.runPromise(
			Effect.provide(
				upsertTemplateProgram(businessId, createCommand),
				Layer.succeed(IDocumentTemplateRepository, {
					findByType: vi.fn(),
					save,
					update: vi.fn(),
				}),
			),
		);

		expect(result).toEqual(mockTemplate);
		expect(save).toHaveBeenCalledWith(businessId, createCommand);
	});

	it("should update an existing template when command has id", async () => {
		const update = vi.fn().mockReturnValue(Effect.succeed(mockTemplate));
		const updateCommand = {
			id: templateId,
			businessId,
			content: {
				title: "Updated Title",
				header: "Updated Header",
				p1: "Updated P1",
				p2: "Updated P2",
				p3: "Updated P3",
				p4: "Updated P4",
				footer: "Updated Footer",
				termsAndConditions: ["Updated term"],
			},
		};

		const result = await Effect.runPromise(
			Effect.provide(
				upsertTemplateProgram(businessId, updateCommand),
				Layer.succeed(IDocumentTemplateRepository, {
					findByType: vi.fn(),
					save: vi.fn(),
					update,
				}),
			),
		);

		expect(result).toEqual(mockTemplate);
		expect(update).toHaveBeenCalledWith(updateCommand);
	});

	it("should propagate DatabaseError from save", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					upsertTemplateProgram(businessId, {
						type: "boarding_agreement",
						name: "Test",
						content: {
							title: "Title",
							header: "Header",
							p1: "P1",
							p2: "P2",
							p3: "P3",
							p4: "P4",
							footer: "Footer",
							termsAndConditions: [],
						},
					}),
					Layer.succeed(IDocumentTemplateRepository, {
						findByType: vi.fn(),
						save: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
						update: vi.fn(),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});

	it("should propagate DatabaseError from update", async () => {
		await expect(
			Effect.runPromise(
				Effect.provide(
					upsertTemplateProgram(businessId, {
						id: templateId,
						businessId,
						content: {
							title: "Title",
							header: "Header",
							p1: "P1",
							p2: "P2",
							p3: "P3",
							p4: "P4",
							footer: "Footer",
							termsAndConditions: [],
						},
					}),
					Layer.succeed(IDocumentTemplateRepository, {
						findByType: vi.fn(),
						save: vi.fn(),
						update: vi.fn().mockReturnValue(
							Effect.fail({
								_tag: "DatabaseError",
								cause: new Error("db fail"),
							}),
						),
					}),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});
