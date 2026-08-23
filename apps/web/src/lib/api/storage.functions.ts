import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import {
	ALLOWED_BUCKETS,
	ALLOWED_MIME_TYPES,
	IStorage,
	MAX_FILE_SIZE_BYTES,
	type TBucket,
} from "@/shared/ports/storage.port";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { logAuditEvent } from "./audit.functions";

const UploadFileInputSchema = Schema.Struct({
	bucket: Schema.String,
	resourceId: Schema.String.pipe(
		Schema.minLength(1),
		Schema.maxLength(64),
		Schema.pattern(/^[A-Za-z0-9_-]+$/),
	),
	fileName: Schema.String.pipe(
		Schema.minLength(1),
		Schema.maxLength(128),
		Schema.pattern(/^[A-Za-z0-9._-]+$/),
	),
	contentType: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(128)),
	data: Schema.String.pipe(Schema.maxLength(5_592_408)),
});

export type TUploadFileInput = Schema.Schema.Type<typeof UploadFileInputSchema>;

export type TUploadFileOutput = {
	readonly url: string;
	readonly key: string;
};

export const uploadFile = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UploadFileInputSchema))
	.handler(async ({ data, context }) => {
		await runApp(requireCapability(context, "storage:write"));

		if (!(ALLOWED_BUCKETS as readonly string[]).includes(data.bucket)) {
			throw new Error(`Bucket "${data.bucket}" is not allowed.`);
		}
		if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(data.contentType)) {
			throw new Error(`Content type "${data.contentType}" is not allowed.`);
		}
		const bucket = data.bucket as TBucket;

		const buffer = base64ToUint8Array(data.data);
		if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
			throw new Error("File size exceeds maximum allowed (4 MB).");
		}

		const key = `${context.tenantId}/${data.resourceId}/${data.fileName}`;

		const program = Effect.gen(function* () {
			const storage = yield* IStorage;
			const { url } = yield* storage.put({
				bucket,
				key,
				body: buffer,
				contentType: data.contentType,
			});
			return { url, key };
		});

		const result = await runApp(program);
		logAuditEvent(
			context.tenantId as TTenantId,
			context.userId as TUserId,
			"storage_upload",
			"file",
			key,
		).catch(() => {});
		return result;
	});

const DeleteFileInputSchema = Schema.Struct({
	bucket: Schema.String,
	key: Schema.String.pipe(
		Schema.minLength(1),
		Schema.maxLength(256),
		Schema.pattern(/^(?!\/)(?!.*\.\.)(?!.*\\)[A-Za-z0-9._/-]+$/),
	),
});

export const deleteFile = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(DeleteFileInputSchema))
	.handler(async ({ data, context }) => {
		await runApp(requireCapability(context, "storage:write"));

		if (!(ALLOWED_BUCKETS as readonly string[]).includes(data.bucket)) {
			throw new Error(`Bucket "${data.bucket}" is not allowed.`);
		}
		if (!data.key.startsWith(`${context.tenantId}/`)) {
			throw new Error("Key must be scoped to the current tenant.");
		}
		const bucket = data.bucket as TBucket;

		const program = Effect.gen(function* () {
			const storage = yield* IStorage;
			yield* storage.delete(bucket, data.key);
			return { success: true as const };
		});

		const result = await runApp(program);
		logAuditEvent(
			context.tenantId as TTenantId,
			context.userId as TUserId,
			"storage_delete",
			"file",
			data.key,
		).catch(() => {});
		return result;
	});

function base64ToUint8Array(b64: string): Uint8Array {
	const binary = atob(b64);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
