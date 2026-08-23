import { Context, type Effect } from "effect";

/**
 * Allowed buckets for file uploads. Server functions must reject any
 * bucket name not in this list so callers cannot poke arbitrary R2
 * bindings via the API surface.
 */
export const ALLOWED_BUCKETS = [
	"boarding-photos",
	"public-assets",
	"pet-photos",
	"grooming-photos",
	"product-images",
	"receipts",
	"portal-assets",
] as const;
export type TBucket = (typeof ALLOWED_BUCKETS)[number];

export const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
] as const;
export type TMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export type TStorageError = {
	readonly _tag: "StorageError";
	readonly message: string;
	readonly cause: unknown;
};

export type TPutInput = {
	readonly bucket: TBucket;
	readonly key: string;
	readonly body: ArrayBuffer | Uint8Array;
	readonly contentType: string;
};

/**
 * Port: IStorage
 * Standardized interface for object storage (Cloudflare R2 in production).
 *
 * Keys are opaque strings produced by the caller (typically a UUIDv4 +
 * original extension). Public URLs are returned to the caller so they can
 * be persisted on a domain row (e.g. boarding_daily_photos.photo_url).
 */
export interface IStorage {
	readonly put: (
		input: TPutInput,
	) => Effect.Effect<{ url: string }, TStorageError>;
	readonly delete: (
		bucket: TBucket,
		key: string,
	) => Effect.Effect<void, TStorageError>;
}

export const IStorage = Context.GenericTag<IStorage>("IStorage");
