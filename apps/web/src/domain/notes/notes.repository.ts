import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TCreateNoteCollectionInput,
	TCreateNoteInput,
	TNoteCollection,
	TPetNote,
	TUpdateNoteInput,
} from "./notes.types";

export class INotesRepository extends Context.Tag("INotesRepository")<
	INotesRepository,
	{
		readonly listCollections: (
			businessId: string,
		) => Effect.Effect<readonly TNoteCollection[], DatabaseError>;
		readonly createCollection: (
			businessId: string,
			userId: string,
			input: TCreateNoteCollectionInput,
		) => Effect.Effect<TNoteCollection, DatabaseError>;
		readonly list: (
			businessId: string,
			options: { readonly includeDeleted: boolean },
		) => Effect.Effect<readonly TPetNote[], DatabaseError>;
		readonly findById: (
			businessId: string,
			id: string,
		) => Effect.Effect<TPetNote | null, DatabaseError>;
		readonly create: (
			businessId: string,
			userId: string,
			input: TCreateNoteInput,
		) => Effect.Effect<TPetNote, DatabaseError>;
		readonly update: (
			businessId: string,
			id: string,
			input: TUpdateNoteInput,
		) => Effect.Effect<TPetNote | null, DatabaseError>;
		readonly setArchived: (
			businessId: string,
			id: string,
			archived: boolean,
		) => Effect.Effect<TPetNote | null, DatabaseError>;
		readonly setDeleted: (
			businessId: string,
			id: string,
			deleted: boolean,
		) => Effect.Effect<TPetNote | null, DatabaseError>;
		readonly emptyTrash: (
			businessId: string,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
