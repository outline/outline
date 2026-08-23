import { and, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { documentTemplates } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { withRetry } from "@/shared/utils";
import { IDocumentTemplateRepository } from "./document-template.repository";
import type {
	IBoardingTemplateContent,
	IDocumentTemplate,
	TTemplateId,
} from "./document-template.types";

type TDocumentTemplateRow = typeof documentTemplates.$inferSelect;
type TDocumentTemplateInsert = typeof documentTemplates.$inferInsert;

const mapTemplateRow = (row: TDocumentTemplateRow): IDocumentTemplate => ({
	id: row.id as TTemplateId,
	businessId: row.businessId,
	type: row.type,
	name: row.name,
	content: row.content as unknown as IBoardingTemplateContent,
	isActive: row.isActive,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

export const DocumentTemplateRepositoryDrizzle = Layer.effect(
	IDocumentTemplateRepository,
	Effect.map(IDrizzleClient, (db) =>
		IDocumentTemplateRepository.of({
			findByType: (businessId, type) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db.query.documentTemplates.findFirst({
								where: {
									RAW: (t, { and, eq }) =>
										and(eq(t.businessId, businessId), eq(t.type, type)),
								},
							});
							return result ? mapTemplateRow(result) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			save: (businessId, cmd) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const values: TDocumentTemplateInsert = {
								businessId,
								type: cmd.type,
								name: cmd.name,
								content: cmd.content,
							};
							const [inserted] = await db
								.insert(documentTemplates)
								.values(values)
								.returning();
							if (!inserted) {
								throw new Error("Insert returned no row");
							}
							return mapTemplateRow(inserted);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			update: (cmd) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// `updated_at` is auto-managed by the
							// `trg_document_templates_updated` BEFORE UPDATE trigger —
							// setting it client-side would race with Postgres'
							// `clock_timestamp()` and could be off by 1 ms.
							const updates: Partial<TDocumentTemplateInsert> = {
								content: cmd.content,
							};
							const [updated] = await db
								.update(documentTemplates)
								.set(updates)
								.where(
									and(
										eq(documentTemplates.id, cmd.id),
										eq(documentTemplates.businessId, cmd.businessId),
									),
								)
								.returning();
							if (!updated) {
								throw new Error(`Update returned no row for id ${cmd.id}`);
							}
							return mapTemplateRow(updated);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
