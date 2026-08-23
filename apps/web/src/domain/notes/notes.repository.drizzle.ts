import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { noteCollections, petNotes } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { withRetry } from "@/shared/utils";
import { INotesRepository } from "./notes.repository";
import type { TNoteCollection, TPetNote } from "./notes.types";

type TCollectionRow = typeof noteCollections.$inferSelect;
type TNoteRow = typeof petNotes.$inferSelect;

const toCollection = (row: TCollectionRow): TNoteCollection => ({
	id: row.id,
	businessId: row.businessId,
	name: row.name,
	description: row.description,
	sortOrder: row.sortOrder,
	isArchived: row.isArchived,
	createdBy: row.createdBy,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

const toNote = (row: TNoteRow): TPetNote => ({
	id: row.id,
	businessId: row.businessId,
	collectionId: row.collectionId,
	parentNoteId: row.parentNoteId,
	createdBy: row.createdBy,
	title: row.title,
	content: row.content,
	icon: row.icon,
	color: row.color,
	isPublished: row.isPublished,
	publishedAt: row.publishedAt,
	isArchived: row.isArchived,
	archivedAt: row.archivedAt,
	deletedAt: row.deletedAt,
	revision: row.revision,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

export const NotesRepositoryDrizzle = Layer.effect(
	INotesRepository,
	Effect.map(IDrizzleClient, (db) =>
		INotesRepository.of({
			listCollections: (businessId) =>
				withRetry(
					Effect.tryPromise({
						try: async () =>
							(
								await db
									.select()
									.from(noteCollections)
									.where(
										and(
											eq(noteCollections.businessId, businessId),
											eq(noteCollections.isArchived, false),
										),
									)
									.orderBy(
										asc(noteCollections.sortOrder),
										asc(noteCollections.name),
									)
							).map(toCollection),
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			createCollection: (businessId, userId, input) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.insert(noteCollections)
								.values({
									businessId,
									createdBy: userId,
									name: input.name,
									description: input.description ?? null,
									sortOrder: input.sortOrder ?? 0,
								})
								.returning();
							if (!row) throw new Error("Note collection was not created");
							return toCollection(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			updateCollection: (businessId, id, input) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.update(noteCollections)
								.set({
									name: input.name.trim() || "Untitled",
									description: input.description ?? null,
									...(input.sortOrder !== undefined
										? { sortOrder: input.sortOrder }
										: {}),
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(noteCollections.businessId, businessId),
										eq(noteCollections.id, id),
									),
								)
								.returning();
							return row ? toCollection(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			setCollectionArchived: (businessId, id, archived) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.update(noteCollections)
								.set({
									isArchived: archived,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(noteCollections.businessId, businessId),
										eq(noteCollections.id, id),
									),
								)
								.returning();
							return row ? toCollection(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			list: (businessId, options) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const visibility = options.includeDeleted
								? undefined
								: and(isNull(petNotes.deletedAt), isNull(petNotes.archivedAt));
							const rows = await db
								.select()
								.from(petNotes)
								.where(and(eq(petNotes.businessId, businessId), visibility))
								.orderBy(desc(petNotes.updatedAt));
							return rows.map(toNote);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			findById: (businessId, id) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.select()
								.from(petNotes)
								.where(
									and(eq(petNotes.businessId, businessId), eq(petNotes.id, id)),
								)
								.limit(1);
							return row ? toNote(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			create: (businessId, userId, input) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const published = input.publish === true;
							const [row] = await db
								.insert(petNotes)
								.values({
									businessId,
									createdBy: userId,
									title: input.title?.trim() || "Untitled",
									content: input.content ?? {},
									collectionId: input.collectionId ?? null,
									parentNoteId: input.parentNoteId ?? null,
									icon: input.icon ?? null,
									color: input.color ?? null,
									isPublished: published,
									publishedAt: published ? new Date().toISOString() : null,
								})
								.returning();
							if (!row) throw new Error("Note was not created");
							return toNote(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			update: (businessId, id, input) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const published = input.publish;
							const [row] = await db
								.update(petNotes)
								.set({
									...(input.title !== undefined
										? { title: input.title.trim() || "Untitled" }
										: {}),
									...(input.content !== undefined
										? { content: input.content }
										: {}),
									...(input.collectionId !== undefined
										? { collectionId: input.collectionId }
										: {}),
									...(input.parentNoteId !== undefined
										? { parentNoteId: input.parentNoteId }
										: {}),
									...(input.icon !== undefined ? { icon: input.icon } : {}),
									...(input.color !== undefined ? { color: input.color } : {}),
									...(published !== undefined
										? {
												isPublished: published,
												publishedAt: published
													? new Date().toISOString()
													: null,
											}
										: {}),
									revision: sql`${petNotes.revision} + 1`,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(eq(petNotes.businessId, businessId), eq(petNotes.id, id)),
								)
								.returning();
							return row ? toNote(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			setArchived: (businessId, id, archived) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.update(petNotes)
								.set({
									isArchived: archived,
									archivedAt: archived ? new Date().toISOString() : null,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(eq(petNotes.businessId, businessId), eq(petNotes.id, id)),
								)
								.returning();
							return row ? toNote(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			setDeleted: (businessId, id, deleted) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const [row] = await db
								.update(petNotes)
								.set({
									deletedAt: deleted ? new Date().toISOString() : null,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(eq(petNotes.businessId, businessId), eq(petNotes.id, id)),
								)
								.returning();
							return row ? toNote(row) : null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			emptyTrash: (businessId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.delete(petNotes)
								.where(
									and(
										eq(petNotes.businessId, businessId),
										isNotNull(petNotes.deletedAt),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
