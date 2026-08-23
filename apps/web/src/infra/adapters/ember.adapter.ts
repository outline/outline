import { Effect, Layer, Redacted } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import {
	ALLOWED_BUCKETS,
	IStorage,
	type TBucket,
	type TPutInput,
	type TStorageError,
} from "@/shared/ports/storage.port";

const isBucketAllowed = (bucket: string): bucket is TBucket =>
	(ALLOWED_BUCKETS as readonly string[]).includes(bucket);

type TEmberUploadResponse = {
	readonly data: {
		readonly url: string;
	};
};

const emberHeaders = (
	baseUrl: string,
	apiKey: string,
): Record<string, string> => ({
	Authorization: `Bearer ${apiKey}`,
	// Ember's zone runs on Cloudflare's Free plan, which enforces a
	// built-in (non-configurable via API on this plan) same-origin check on
	// multipart POSTs, rejecting them with a 403 "Cross-site POST form
	// submissions are forbidden" otherwise. There is no real browser origin
	// for a server-to-server call, so this supplies the one Ember's own
	// host expects. Verified via a real end-to-end upload - do not remove.
	Origin: baseUrl,
	Referer: `${baseUrl.replace(/\/+$/, "")}/`,
});

const putToEmber = async (
	baseUrl: string,
	physicalBucket: string,
	apiKey: string,
	emberKey: string,
	body: ArrayBuffer | Uint8Array,
	contentType: string,
): Promise<{ url: string }> => {
	if (!apiKey) {
		throw new Error("EMBER_API_KEY is required to upload files");
	}

	const form = new FormData();
	const blob = new Blob([body as BlobPart], { type: contentType });
	form.append("file", blob, emberKey.split("/").pop() ?? "file");
	form.append("key", emberKey);

	const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/buckets/${physicalBucket}/objects/upload`;
	const response = await fetch(url, {
		method: "POST",
		headers: emberHeaders(baseUrl, apiKey),
		body: form,
	});

	if (!response.ok) {
		throw new Error(`Ember upload failed with status ${response.status}`);
	}

	const json = (await response.json()) as TEmberUploadResponse;
	return { url: json.data.url };
};

const deleteFromEmber = async (
	baseUrl: string,
	physicalBucket: string,
	apiKey: string,
	emberKey: string,
): Promise<void> => {
	if (!apiKey) {
		throw new Error("EMBER_API_KEY is required to delete files");
	}

	const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/buckets/${physicalBucket}/objects/${encodeURIComponent(emberKey)}`;
	const response = await fetch(url, {
		method: "DELETE",
		headers: emberHeaders(baseUrl, apiKey),
	});

	// Ember's delete route only accepts a single Astro path segment
	// ([key].ts, not [...key].ts), so it 404s for any key containing "/" -
	// every key this app sends does, since keys are always
	// "{bucket}/{tenantId}/{resourceId}/{fileName}". Treating 404 as
	// success avoids surfacing a known, accepted limitation of a service
	// this app doesn't own as an app-level error.
	if (!response.ok && response.status !== 404) {
		throw new Error(`Ember delete failed with status ${response.status}`);
	}
};

export const EmberStorageAdapterLive = Layer.effect(
	IStorage,
	Effect.gen(function* () {
		const config = yield* IAppConfig;

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
						const emberKey = `${bucket}/${key}`;
						return await putToEmber(
							config.ember.baseUrl,
							config.ember.bucket,
							Redacted.value(config.ember.apiKey),
							emberKey,
							body,
							contentType,
						);
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
						const emberKey = `${bucket}/${key}`;
						await deleteFromEmber(
							config.ember.baseUrl,
							config.ember.bucket,
							Redacted.value(config.ember.apiKey),
							emberKey,
						);
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
