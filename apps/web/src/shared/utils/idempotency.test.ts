import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
	canonicalJson,
	hashIdempotencyPayload,
	IdempotencyConflictError,
	IdempotencyMissingKeyError,
	runWithIdempotency,
	type TIdempotencyRecord,
	type TIdempotencyService,
} from "./idempotency";

const makeFakeService = (
	overrides: Partial<TIdempotencyService> = {},
): TIdempotencyService & {
	_find: ReturnType<typeof vi.fn>;
	_record: ReturnType<typeof vi.fn>;
} => {
	const find = vi.fn(
		(_tenantId: string, _key: string) => Effect.succeed(null) as never,
	);
	const record = vi.fn(
		(_tenantId: string, _key: string, _h: string, _body: string, _st: number) =>
			Effect.succeed(undefined) as never,
	);
	return Object.assign({ find, record }, overrides, {
		_find: find,
		_record: record,
	}) as never;
};

const TENANT_A = "00000000-0000-0000-0000-00000000000a";
const TENANT_B = "00000000-0000-0000-0000-00000000000b";

describe("canonicalJson", () => {
	it("sorts object keys", () => {
		const a = canonicalJson({ b: 2, a: 1 });
		const b = canonicalJson({ a: 1, b: 2 });
		expect(a).toBe(b);
	});

	it("drops undefined values", () => {
		const a = canonicalJson({ a: 1, b: undefined });
		const b = canonicalJson({ a: 1 });
		expect(a).toBe(b);
	});

	it("normalises Date instances to ISO strings", () => {
		const a = canonicalJson({ d: new Date("2026-07-16T00:00:00Z") });
		const b = canonicalJson({
			d: { __type: "Date", value: "2026-07-16T00:00:00.000Z" },
		});
		expect(a).toBe(b);
	});

	it("is stable across nested reorders", () => {
		const a = canonicalJson({
			owner: { z: 1, a: { y: 2, b: 3 } },
			items: [
				{ x: 1, y: 2 },
				{ y: 5, x: 4 },
			],
		});
		const b = canonicalJson({
			items: [
				{ y: 2, x: 1 },
				{ x: 4, y: 5 },
			],
			owner: { a: { b: 3, y: 2 }, z: 1 },
		});
		expect(a).toBe(b);
	});

	it("handles circular references without throwing", () => {
		const obj: Record<string, unknown> = { a: 1 };
		obj.self = obj;
		expect(() => canonicalJson(obj)).not.toThrow();
	});
});

describe("hashIdempotencyPayload", () => {
	it("produces stable hashes for equivalent payloads", async () => {
		const h1 = await hashIdempotencyPayload({ b: 2, a: 1 });
		const h2 = await hashIdempotencyPayload({ a: 1, b: 2 });
		expect(h1).toBe(h2);
		expect(h1).toMatch(/^[0-9a-f]{64}$/);
	});

	it("differs when an optional key is present vs absent", async () => {
		const h1 = await hashIdempotencyPayload({ a: 1 });
		const h2 = await hashIdempotencyPayload({ a: 1, b: 2 });
		expect(h1).not.toBe(h2);
	});
});

describe("runWithIdempotency", () => {
	const KEY = "abcdef1234567890abcdef1234567890";

	it("rejects missing keys with a typed error", async () => {
		const svc = makeFakeService();
		await expect(
			runWithIdempotency(
				{ tenantId: TENANT_A, idempotencyKey: undefined, requestPayload: {} },
				async () => 1,
				svc,
			),
		).rejects.toBeInstanceOf(IdempotencyMissingKeyError);

		await expect(
			runWithIdempotency(
				{ tenantId: TENANT_A, idempotencyKey: "short", requestPayload: {} },
				async () => 1,
				svc,
			),
		).rejects.toBeInstanceOf(IdempotencyMissingKeyError);
	});

	it("runs the handler when the key is fresh and persists the response", async () => {
		const svc = makeFakeService();
		const handler = vi.fn(async () => ({ ok: true, bookingId: "B-1" }));

		const result = await runWithIdempotency(
			{ tenantId: TENANT_A, idempotencyKey: KEY, requestPayload: { a: 1 } },
			handler,
			svc,
		);

		expect(result).toEqual({ ok: true, bookingId: "B-1" });
		expect(handler).toHaveBeenCalledOnce();
		expect(svc._find).toHaveBeenCalledWith(TENANT_A, KEY);
		expect(svc._record).toHaveBeenCalledOnce();
		const recorded = svc._record.mock.calls[0] as unknown[];
		expect(recorded[0]).toBe(TENANT_A);
		expect(recorded[1]).toBe(KEY);
		expect(typeof recorded[2]).toBe("string");
		expect(recorded[4]).toBe(200);
	});

	it("replays the cached response when the same key + hash is seen again", async () => {
		const cachedRequestPayload = { name: "Adi" };
		const cached: TIdempotencyRecord = {
			requestHash: await hashIdempotencyPayload(cachedRequestPayload),
			responseBody: JSON.stringify({
				ok: true,
				bookingId: "B-2",
				replayed: true,
			}),
			responseStatus: 200,
		};
		const svc = makeFakeService();

		svc._find.mockReturnValue(Effect.succeed(cached) as never);

		const handler = vi.fn(async () => ({ ok: false }));
		const result = await runWithIdempotency(
			{
				tenantId: TENANT_A,
				idempotencyKey: KEY,
				requestPayload: cachedRequestPayload,
			},
			handler,
			svc,
		);

		expect(handler).not.toHaveBeenCalled();
		expect(result).toEqual({
			ok: true,
			bookingId: "B-2",
			replayed: true,
		});
		expect(svc._record).not.toHaveBeenCalled();
	});

	it("rejects key reuse with a different payload", async () => {
		const cachedHash = await hashIdempotencyPayload({ name: "Adi" });
		const svc = makeFakeService({
			find: vi.fn(() =>
				Effect.succeed({
					requestHash: cachedHash,
					responseBody: "{}",
					responseStatus: 200,
				} as never),
			) as never,
		});

		const handler = vi.fn(async () => ({ ok: true }));
		await expect(
			runWithIdempotency(
				{
					tenantId: TENANT_A,
					idempotencyKey: KEY,
					requestPayload: { name: "Beda" },
				},
				handler,
				svc,
			),
		).rejects.toBeInstanceOf(IdempotencyConflictError);
		expect(handler).not.toHaveBeenCalled();
	});

	it("keys are tenant-scoped (one tenant cannot replay another's response)", async () => {
		const cachedHash = await hashIdempotencyPayload({ name: "Adi" });
		const svc = makeFakeService();

		svc._find.mockImplementation((tenantId: string) => {
			if (tenantId === TENANT_A) {
				return Effect.succeed({
					requestHash: cachedHash,
					responseBody: '{"x":1}',
					responseStatus: 200,
				} as never);
			}
			return Effect.succeed(null as never);
		});

		const handlerA = vi.fn(async () => ({ ok: true, t: "A" }));
		const handlerB = vi.fn(async () => ({ ok: true, t: "B" }));

		// First call: tenant A replays cached response.
		const rA = await runWithIdempotency(
			{
				tenantId: TENANT_A,
				idempotencyKey: KEY,
				requestPayload: { name: "Adi" },
			},
			handlerA,
			svc,
		);
		expect(rA).toEqual({ x: 1 });
		expect(handlerA).not.toHaveBeenCalled();

		// Second call: tenant B is independent — handler runs.
		const rB = await runWithIdempotency(
			{
				tenantId: TENANT_B,
				idempotencyKey: KEY,
				requestPayload: { name: "Adi" },
			},
			handlerB,
			svc,
		);
		expect(rB).toEqual({ ok: true, t: "B" });
		expect(handlerB).toHaveBeenCalledOnce();
	});
});
