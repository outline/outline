// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { businesses } from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IDocumentTemplateRepository } from "./document-template.repository";
import { DocumentTemplateRepositoryDrizzle } from "./document-template.repository.drizzle";
import type { IBoardingTemplateContent } from "./document-template.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const templateRepoLayer = Layer.provide(
	DocumentTemplateRepositoryDrizzle,
	DrizzleClientLive,
);
const run = <A, E>(effect: Effect.Effect<A, E, IDocumentTemplateRepository>) =>
	Effect.runPromise(Effect.provide(effect, templateRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = () =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

const makeContent = (
	overrides: Partial<IBoardingTemplateContent> = {},
): IBoardingTemplateContent => ({
	title: "Boarding Agreement",
	header: "Header text",
	p1: "Para 1",
	p2: "Para 2",
	p3: "Para 3",
	p4: "Para 4",
	footer: "Footer text",
	termsAndConditions: ["T&C 1", "T&C 2"],
	...overrides,
});

describe.skipIf(!hasDb)(
	"document-template repository drizzle (integration)",
	() => {
		const tenantId = generateId<TTenantId>();
		const ownerUserId = "00000000-0000-0000-0000-000000000000";
		const prefix = `__smoke_doctpl_${Date.now()}`;

		beforeAll(async () => {
			if (!hasDb) return;
			const db = await getDb();
			await db.insert(businesses).values({
				id: tenantId,
				name: `${prefix} Test Business`,
				ownerId: ownerUserId,
			});
		});

		afterAll(async () => {
			if (!hasDb) return;
			const db = await getDb();
			await db.execute(
				sql`DELETE FROM document_templates WHERE name LIKE ${`${prefix}%`}`,
			);
			await db.delete(businesses).where(eq(businesses.id, tenantId));
		});

		it("save() inserts a row and findByType returns it", async () => {
			const templateName = `${prefix} Save Test`;
			const type = `${prefix}_save`;

			const saved = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.save(tenantId, {
						type,
						name: templateName,
						content: makeContent({ title: "Saved Template" }),
					});
				}),
			);

			expect(saved.id).toBeTruthy();
			expect(saved.businessId).toBe(tenantId);
			expect(saved.type).toBe(type);
			expect(saved.name).toBe(templateName);
			expect(saved.isActive).toBe(true);

			const found = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.findByType(tenantId, type);
				}),
			);

			expect(found).not.toBeNull();
			expect(found?.id).toBe(saved.id);
			expect(found?.content.title).toBe("Saved Template");
		}, 15000);

		it("findByType() returns null for an unknown type", async () => {
			const found = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.findByType(tenantId, `${prefix}_does_not_exist`);
				}),
			);

			expect(found).toBeNull();
		}, 15000);

		it("findByType() is tenant-scoped (other tenants see nothing)", async () => {
			const type = `${prefix}_tenant_iso`;
			const otherTenantId = "11111111-1111-1111-1111-111111111111";

			await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.save(tenantId, {
						type,
						name: `${prefix} Tenant Iso`,
						content: makeContent(),
					});
				}),
			);

			const leaked = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.findByType(otherTenantId, type);
				}),
			);

			expect(leaked).toBeNull();
		}, 15000);

		it("update() mutates the content column", async () => {
			const templateName = `${prefix} Update Test`;
			const type = `${prefix}_update`;

			// delete any prior row for this `(tenantId, type)` pair first so the
			// unique constraint doesn't fire across test re-runs on the same row
			const db = await getDb();
			await db.execute(
				sql`DELETE FROM document_templates WHERE business_id = ${tenantId} AND type = ${type}`,
			);

			const saved = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.save(tenantId, {
						type,
						name: templateName,
						content: makeContent({ title: "Original" }),
					});
				}),
			);

			const updated = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.update({
						id: saved.id,
						businessId: tenantId,
						content: makeContent({ title: "Updated" }),
					});
				}),
			);

			expect(updated.id).toBe(saved.id);
			expect(updated.content.title).toBe("Updated");
			expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
				new Date(saved.updatedAt).getTime(),
			);

			const found = await run(
				Effect.gen(function* () {
					const repo = yield* IDocumentTemplateRepository;
					return yield* repo.findByType(tenantId, type);
				}),
			);
			expect(found?.content.title).toBe("Updated");
		}, 15000);
	},
);
