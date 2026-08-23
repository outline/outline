import { Effect } from "effect";
import { INotesRepository } from "./notes.repository";
import type {
	TCreateNoteCollectionInput,
	TCreateNoteInput,
	TUpdateNoteInput,
} from "./notes.types";

export const listNoteCollectionsProgram = (businessId: string) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.listCollections(businessId);
	});

export const createNoteCollectionProgram = (
	businessId: string,
	userId: string,
	input: TCreateNoteCollectionInput,
) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.createCollection(businessId, userId, input);
	});

export const listNotesProgram = (businessId: string, includeDeleted = false) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.list(businessId, { includeDeleted });
	});

export const getNoteProgram = (businessId: string, id: string) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.findById(businessId, id);
	});

export const createNoteProgram = (
	businessId: string,
	userId: string,
	input: TCreateNoteInput,
) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.create(businessId, userId, input);
	});

export const updateNoteProgram = (
	businessId: string,
	id: string,
	input: TUpdateNoteInput,
) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.update(businessId, id, input);
	});

export const archiveNoteProgram = (businessId: string, id: string) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.setArchived(businessId, id, true);
	});

export const restoreNoteProgram = (businessId: string, id: string) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.setArchived(businessId, id, false);
	});

export const deleteNoteProgram = (businessId: string, id: string) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.setDeleted(businessId, id, true);
	});

export const emptyNotesTrashProgram = (businessId: string) =>
	Effect.gen(function* () {
		const repository = yield* INotesRepository;
		return yield* repository.emptyTrash(businessId);
	});
