import { Context, Effect, Layer } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import {
	ALLOWED_BUCKETS,
	IStorage,
	type TBucket,
	type TPutInput,
	type TStorageError,
} from "@/shared/ports/storage.port";

interface TR2Bucket {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
		options?: { httpMetadata?: { contentType?: string } },
	): Promise<{ key: string }>;
	delete(key: string): Promise<void>;
}

export class R2Bindings extends Context.Tag("R2Bindings")<
	R2Bindings,
	Record<TBucket, TR2Bucket>
>() {
	static readonly default: Record<TBucket, TR2Bucket> = {} as Record<
		TBucket,
		TR2Bucket
	>;
}

function makePublicUrl(
	bucket: TBucket,
	key: string,
	publicUrlBase: string,
): string {
	const base = publicUrlBase.replace(/\/+$/, "");
	return `${base}/${bucket}/${key}`;
}

export const R2StorageAdapterLive = Layer.effect(
	IStorage,
	Effect.gen(function* () {
		const config = yield* IAppConfig;
		const bindings = yield* R2Bindings;
		const publicUrlBase = config.storage.publicUrlBase;

		const isBucketAllowed = (bucket: string): bucket is TBucket =>
			(ALLOWED_BUCKETS as readonly string[]).includes(bucket);

		return IStorage.of({
			put: ({ bucket, key, body, contentType }: TPutInput) =>
				Effect.tryPromise({
					try: async () => {
						if (!isBucketAllowed(bucket)) {
							throw new Error(`Unknown bucket: ${bucket}`);
						}
						if (
							key.startsWith("/") ||
							key.includes("..") ||
							key.includes("\\")
						) {
							throw new Error("Unsafe storage key");
						}
						const r2 = bindings[bucket];
						if (!r2) {
							throw new Error(
								`R2 binding for bucket "${bucket}" not available.`,
							);
						}
						await r2.put(key, body, {
							httpMetadata: { contentType },
						});
						return { url: makePublicUrl(bucket, key, publicUrlBase) };
					},
					catch: (e) =>
						({
							_tag: "StorageError",
							message: `Failed to upload "${key}" to bucket "${bucket}"`,
							cause: e,
						}) as TStorageError,
				}),

			delete: (bucket, key) =>
				Effect.tryPromise({
					try: async () => {
						if (!isBucketAllowed(bucket)) {
							throw new Error(`Unknown bucket: ${bucket}`);
						}
						const r2 = bindings[bucket];
						if (!r2) {
							throw new Error(
								`R2 binding for bucket "${bucket}" not available.`,
							);
						}
						await r2.delete(key);
					},
					catch: (e) =>
						({
							_tag: "StorageError",
							message: `Failed to delete "${key}" from bucket "${bucket}"`,
							cause: e,
						}) as TStorageError,
				}),
		});
	}),
);

export const R2BindingsLive = (bindings: Record<TBucket, TR2Bucket>) =>
	Layer.succeed(R2Bindings, bindings);

export const R2BindingsFromGlobal = Layer.effect(
	R2Bindings,
	Effect.sync(() => {
		const result = {} as Record<TBucket, TR2Bucket>;
		for (const bucket of ALLOWED_BUCKETS) {
			const globalKey =
				bucket === "boarding-photos" ? "BOARDING_PHOTOS" : "PUBLIC_ASSETS";
			const binding = (globalThis as Record<string, unknown>)[globalKey] as
				| TR2Bucket
				| undefined;
			if (binding) result[bucket] = binding;
		}
		return result;
	}),
);
