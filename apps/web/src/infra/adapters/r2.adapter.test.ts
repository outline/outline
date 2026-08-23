import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { AppConfigLive } from "@/shared/env/app.config";
import {
	ALLOWED_BUCKETS,
	ALLOWED_MIME_TYPES,
	IStorage,
	MAX_FILE_SIZE_BYTES,
	type TBucket,
	type TPutInput,
	type TStorageError,
} from "@/shared/ports/storage.port";
import { R2BindingsLive, R2StorageAdapterLive } from "./r2.adapter";

const makeMockBucket = () => ({
	put: vi.fn().mockResolvedValue({ key: "test-key" }),
	delete: vi.fn().mockResolvedValue(undefined),
});

type MockBucket = ReturnType<typeof makeMockBucket>;

const makeStorage = async (
	mockBuckets: Partial<Record<TBucket, MockBucket>>,
) => {
	const bindings: Record<TBucket, MockBucket> = {} as Record<
		TBucket,
		MockBucket
	>;
	for (const bucket of ALLOWED_BUCKETS) {
		bindings[bucket] = mockBuckets[bucket] ?? makeMockBucket();
	}
	const layer = Layer.provideMerge(
		Layer.provideMerge(R2StorageAdapterLive, R2BindingsLive(bindings)),
		AppConfigLive,
	);
	const storage = await Effect.runPromise(
		Effect.flatMap(IStorage, (s) => Effect.succeed(s)).pipe(
			Effect.provide(layer),
		),
	);
	return storage as {
		put: (input: TPutInput) => Effect.Effect<{ url: string }, TStorageError>;
		delete: (
			bucket: TBucket,
			key: string,
		) => Effect.Effect<void, TStorageError>;
	};
};

describe("R2StorageAdapter", () => {
	it("should upload a file to a valid bucket", async () => {
		const mockBucket = makeMockBucket();
		const storage = await makeStorage({ "boarding-photos": mockBucket });

		const result = await Effect.runPromise(
			storage.put({
				bucket: "boarding-photos",
				key: "biz-1/boarding-123/photo.jpg",
				body: new Uint8Array([1, 2, 3]),
				contentType: "image/jpeg",
			}),
		);

		expect(result.url).toContain("boarding-photos");
		expect(mockBucket.put).toHaveBeenCalledWith(
			"biz-1/boarding-123/photo.jpg",
			expect.any(Uint8Array),
			expect.objectContaining({
				httpMetadata: { contentType: "image/jpeg" },
			}),
		);
	});

	it("should reject unknown bucket", async () => {
		const storage = await makeStorage({});
		const result = await Effect.runPromise(
			Effect.flip(
				storage.put({
					bucket: "unknown" as TBucket,
					key: "test.jpg",
					body: new Uint8Array(),
					contentType: "image/jpeg",
				}),
			),
		);

		expect((result as { _tag: string })._tag).toBe("StorageError");
	});

	it("should reject path traversal in key", async () => {
		const storage = await makeStorage({ "boarding-photos": makeMockBucket() });

		const result = await Effect.runPromise(
			Effect.flip(
				storage.put({
					bucket: "boarding-photos",
					key: "../other-tenant/secret.jpg",
					body: new Uint8Array(),
					contentType: "image/jpeg",
				}),
			),
		);

		expect((result as { _tag: string })._tag).toBe("StorageError");
	});

	it("should delete a file from a valid bucket", async () => {
		const mockBucket = makeMockBucket();
		const storage = await makeStorage({ "boarding-photos": mockBucket });

		await Effect.runPromise(
			storage.delete("boarding-photos", "biz-1/boarding-123/photo.jpg"),
		);

		expect(mockBucket.delete).toHaveBeenCalledWith(
			"biz-1/boarding-123/photo.jpg",
		);
	});

	it("should reject delete from unknown bucket", async () => {
		const storage = await makeStorage({});
		const result = await Effect.runPromise(
			Effect.flip(storage.delete("unknown" as TBucket, "test.jpg")),
		);

		expect(result._tag).toBe("StorageError");
	});
});

describe("ALLOWED_MIME_TYPES", () => {
	it("should allow jpeg, png, webp, pdf", () => {
		expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
		expect(ALLOWED_MIME_TYPES).toContain("image/png");
		expect(ALLOWED_MIME_TYPES).toContain("image/webp");
		expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
	});

	it("should not include other types", () => {
		expect(ALLOWED_MIME_TYPES).not.toContain("image/gif");
		expect(ALLOWED_MIME_TYPES).not.toContain("text/plain");
	});
});

describe("MAX_FILE_SIZE_BYTES", () => {
	it("should be 4 MB", () => {
		expect(MAX_FILE_SIZE_BYTES).toBe(4 * 1024 * 1024);
	});
});
