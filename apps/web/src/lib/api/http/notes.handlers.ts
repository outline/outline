import type {
	TCreateNoteCollectionInput,
	TCreateNoteInput,
	TNoteCollection,
	TPetNote,
	TUpdateNoteInput,
} from "@/domain/notes/notes.types";
import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface NotesSession {
	readonly business: { readonly id: string };
	readonly user: { readonly id: string };
}

interface NotesHandlerDependencies {
	readonly session: (token: string) => Promise<NotesSession | null>;
	readonly listCollections: (
		businessId: string,
	) => Promise<readonly TNoteCollection[]>;
	readonly createCollection: (
		businessId: string,
		userId: string,
		input: TCreateNoteCollectionInput,
	) => Promise<TNoteCollection>;
	readonly updateCollection: (
		businessId: string,
		id: string,
		input: TCreateNoteCollectionInput,
	) => Promise<TNoteCollection | null>;
	readonly archiveCollection: (
		businessId: string,
		id: string,
	) => Promise<TNoteCollection | null>;
	readonly restoreCollection: (
		businessId: string,
		id: string,
	) => Promise<TNoteCollection | null>;
	readonly list: (
		businessId: string,
		includeDeleted: boolean,
	) => Promise<readonly TPetNote[]>;
	readonly get: (businessId: string, id: string) => Promise<TPetNote | null>;
	readonly create: (
		businessId: string,
		userId: string,
		input: TCreateNoteInput,
	) => Promise<TPetNote>;
	readonly update: (
		businessId: string,
		id: string,
		input: TUpdateNoteInput,
	) => Promise<TPetNote | null>;
	readonly archive: (
		businessId: string,
		id: string,
	) => Promise<TPetNote | null>;
	readonly restore: (
		businessId: string,
		id: string,
	) => Promise<TPetNote | null>;
	readonly remove: (businessId: string, id: string) => Promise<TPetNote | null>;
	readonly emptyTrash: (businessId: string) => Promise<void>;
}

export interface NotesHandlers {
	readonly collections: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly collection: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
	readonly notes: (request: Request, requestId: string) => Promise<Response>;
	readonly note: (
		request: Request,
		requestId: string,
		id: string,
	) => Promise<Response>;
	readonly action: (
		request: Request,
		requestId: string,
		id: string,
		action: "archive" | "restore" | "delete",
	) => Promise<Response>;
	readonly emptyTrash: (
		request: Request,
		requestId: string,
	) => Promise<Response>;
}

/** Creates authenticated REST handlers for tenant-scoped notes. */
export function createNotesHandlers(
	dependencies: NotesHandlerDependencies,
): NotesHandlers {
	return {
		collections: async (request, requestId) => {
			const session = await authenticate(request, requestId, dependencies);
			if (session instanceof Response) return session;
			if (request.method === "GET") {
				return jsonSuccess(
					await dependencies.listCollections(session.business.id),
					requestId,
				);
			}
			const body = await readBody(request);
			if (typeof body?.name !== "string" || body.name.trim() === "") {
				return validationError(requestId, "name is required");
			}
			return jsonSuccess(
				await dependencies.createCollection(
					session.business.id,
					session.user.id,
					{
						name: body.name.trim(),
						description:
							typeof body.description === "string" ? body.description : null,
					},
				),
				requestId,
				201,
			);
		},
		collection: async (request, requestId, id) => {
			const session = await authenticate(request, requestId, dependencies);
			if (session instanceof Response) return session;
			if (request.method === "PATCH") {
				const body = await readBody(request);
				if (typeof body?.name !== "string" || body.name.trim() === "") {
					return validationError(requestId, "name is required");
				}
				const collection = await dependencies.updateCollection(
					session.business.id,
					id,
					{
						name: body.name.trim(),
						description:
							typeof body.description === "string" ? body.description : null,
					},
				);
				return collection
					? jsonSuccess(collection, requestId)
					: notFound(requestId);
			}
			if (request.method !== "POST") return methodNotAllowed(requestId);
			const action = new URL(request.url).searchParams.get("action");
			const collection =
				action === "restore"
					? await dependencies.restoreCollection(session.business.id, id)
					: await dependencies.archiveCollection(session.business.id, id);
			return collection
				? jsonSuccess(collection, requestId)
				: notFound(requestId);
		},
		notes: async (request, requestId) => {
			const session = await authenticate(request, requestId, dependencies);
			if (session instanceof Response) return session;
			if (request.method === "GET") {
				return jsonSuccess(
					await dependencies.list(
						session.business.id,
						new URL(request.url).searchParams.get("includeDeleted") === "true",
					),
					requestId,
				);
			}
			const input = parseNoteInput(await readBody(request));
			if (!input) return validationError(requestId, "invalid note payload");
			return jsonSuccess(
				await dependencies.create(session.business.id, session.user.id, input),
				requestId,
				201,
			);
		},
		note: async (request, requestId, id) => {
			const session = await authenticate(request, requestId, dependencies);
			if (session instanceof Response) return session;
			if (request.method === "GET") {
				const note = await dependencies.get(session.business.id, id);
				return note ? jsonSuccess(note, requestId) : notFound(requestId);
			}
			if (request.method !== "PATCH") return methodNotAllowed(requestId);
			const input = parseUpdateInput(await readBody(request));
			if (!input) return validationError(requestId, "invalid note payload");
			const note = await dependencies.update(session.business.id, id, input);
			return note ? jsonSuccess(note, requestId) : notFound(requestId);
		},
		action: async (request, requestId, id, action) => {
			const session = await authenticate(request, requestId, dependencies);
			if (session instanceof Response) return session;
			if (request.method !== "POST") return methodNotAllowed(requestId);
			const note =
				action === "archive"
					? await dependencies.archive(session.business.id, id)
					: action === "restore"
						? await dependencies.restore(session.business.id, id)
						: await dependencies.remove(session.business.id, id);
			return note ? jsonSuccess(note, requestId) : notFound(requestId);
		},
		emptyTrash: async (request, requestId) => {
			const session = await authenticate(request, requestId, dependencies);
			if (session instanceof Response) return session;
			if (request.method !== "POST") return methodNotAllowed(requestId);
			await dependencies.emptyTrash(session.business.id);
			return jsonSuccess({ emptied: true }, requestId);
		},
	};
}

async function authenticate(
	request: Request,
	requestId: string,
	dependencies: NotesHandlerDependencies,
): Promise<NotesSession | Response> {
	const token = readSessionToken(request);
	if (!token) return unauthorized(requestId);
	const session = await dependencies.session(token);
	return session ?? unauthorized(requestId);
}

async function readBody(
	request: Request,
): Promise<Record<string, unknown> | undefined> {
	try {
		const value: unknown = await request.json();
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

function parseNoteInput(
	body: Record<string, unknown> | undefined,
): TCreateNoteInput | undefined {
	if (!body) return undefined;
	return {
		...(typeof body.title === "string" ? { title: body.title } : {}),
		...(isJsonObject(body.content) ? { content: body.content } : {}),
		...(typeof body.collectionId === "string" || body.collectionId === null
			? { collectionId: body.collectionId }
			: {}),
		...(typeof body.parentNoteId === "string" || body.parentNoteId === null
			? { parentNoteId: body.parentNoteId }
			: {}),
		...(typeof body.icon === "string" || body.icon === null
			? { icon: body.icon }
			: {}),
		...(typeof body.color === "string" || body.color === null
			? { color: body.color }
			: {}),
		...(typeof body.publish === "boolean" ? { publish: body.publish } : {}),
	};
}

function parseUpdateInput(
	body: Record<string, unknown> | undefined,
): TUpdateNoteInput | undefined {
	if (!body) return undefined;
	return parseNoteInput(body);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}

function validationError(requestId: string, message: string): Response {
	return jsonError(
		new ApiHttpError(422, "validation_error", message),
		requestId,
	);
}

function notFound(requestId: string): Response {
	return jsonError(
		new ApiHttpError(404, "not_found", "Note not found"),
		requestId,
	);
}

function methodNotAllowed(requestId: string): Response {
	return jsonError(
		new ApiHttpError(405, "method_not_allowed", "Method not allowed"),
		requestId,
	);
}
