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

const makeFakeService = (): TIdempotencyService & {
	_reserve: ReturnType<typeof vi.fn>;
	_complete: ReturnType<typeof vi.fn>;
	_release: ReturnType<typeof vi.fn>;
} => {
	const reserve = vi.fn(
		(_tenantId: string, _key: string, _requestHash: string) =>
			Effect.succeed({
				_tag: "Acquired",
				reservationCreatedAt: "2026-08-24T00:00:00.000Z",
			} as const),
	);
	const complete = vi.fn(
		(
			_tenantId: string,
			_key: string,
			_h: string,
			_body: string,
			_st: number,
			_reservationCreatedAt: string,
		) => Effect.succeed(true),
	);
	const release = vi.fn(
		(
			_tenantId: string,
			_key: string,
			_h: string,
			_reservationCreatedAt: string,
		) => Effect.succeed(true),
	);
	return {
		reserve,
		complete,
		release,
		_reserve: reserve,
		_complete: complete,
		_release: release,
	};
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

	const makeAtomicFakeService = () => {
		let reservation:
			| {
					requestHash: string;
					reservationCreatedAt: string;
					responseBody?: string;
					responseStatus?: number;
			  }
			| undefined;

		return {
			reserve: (_tenantId: string, _key: string, requestHash: string) =>
				Effect.sync(() => {
					if (!reservation) {
						reservation = {
							requestHash,
							reservationCreatedAt: new Date().toISOString(),
						};
						return {
							_tag: "Acquired",
							reservationCreatedAt: reservation.reservationCreatedAt,
						} as const;
					}
					if (
						reservation.responseBody !== undefined &&
						reservation.responseStatus !== undefined
					) {
						return {
							_tag: "Completed",
							record: {
								requestHash: reservation.requestHash,
								responseBody: reservation.responseBody,
								responseStatus: reservation.responseStatus,
							},
						} as const;
					}
					return {
						_tag: "InProgress",
						requestHash: reservation.requestHash,
					} as const;
				}),
			complete: (
				_tenantId: string,
				_key: string,
				requestHash: string,
				responseBody: string,
				responseStatus: number,
				reservationCreatedAt: string,
			) =>
				Effect.sync(() => {
					if (
						!reservation ||
						reservation.requestHash !== requestHash ||
						reservation.reservationCreatedAt !== reservationCreatedAt ||
						reservation.responseBody !== undefined
					) {
						return false;
					}
					reservation = {
						requestHash,
						reservationCreatedAt,
						responseBody,
						responseStatus,
					};
					return true;
				}),
			release: (
				_tenantId: string,
				_key: string,
				requestHash: string,
				reservationCreatedAt: string,
			) =>
				Effect.sync(() => {
					if (
						!reservation ||
						reservation.requestHash !== requestHash ||
						reservation.reservationCreatedAt !== reservationCreatedAt ||
						reservation.responseBody !== undefined
					) {
						return false;
					}
					reservation = undefined;
					return true;
				}),
		};
	};

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
		expect(svc._reserve).toHaveBeenCalledWith(
			TENANT_A,
			KEY,
			expect.any(String),
		);
		expect(svc._complete).toHaveBeenCalledWith(
			TENANT_A,
			KEY,
			expect.any(String),
			JSON.stringify({ ok: true, bookingId: "B-1" }),
			200,
			expect.any(String),
		);
	});

	it("does not return the handler result before completion is persisted", async () => {
		const svc = makeFakeService();
		let finishPersistence: ((completed: boolean) => void) | undefined;
		const persistence = new Promise<boolean>((resolve) => {
			finishPersistence = resolve;
		});
		svc._complete.mockReturnValue(Effect.promise(() => persistence));
		let settled = false;

		const execution = runWithIdempotency(
			{ tenantId: TENANT_A, idempotencyKey: KEY, requestPayload: { a: 1 } },
			async () => ({ bookingId: "B-durable" }),
			svc,
		).finally(() => {
			settled = true;
		});

		await vi.waitFor(() => expect(svc._complete).toHaveBeenCalledOnce());
		expect(settled).toBe(false);
		finishPersistence?.(true);
		await expect(execution).resolves.toEqual({ bookingId: "B-durable" });
	});

	it("does not return a result when its reservation can no longer be completed", async () => {
		const svc = makeFakeService();
		svc._complete.mockReturnValue(Effect.succeed(false));

		await expect(
			runWithIdempotency(
				{
					tenantId: TENANT_A,
					idempotencyKey: KEY,
					requestPayload: { a: 1 },
				},
				async () => ({ bookingId: "B-lost" }),
				svc,
			),
		).rejects.toMatchObject({ name: "IdempotencyCompletionError" });
	});

	it("awaits release of an acquired reservation when the handler fails", async () => {
		const svc = makeFakeService();
		const handlerError = new Error("booking failed");
		let finishRelease: ((released: boolean) => void) | undefined;
		const release = new Promise<boolean>((resolve) => {
			finishRelease = resolve;
		});
		svc._release.mockReturnValue(Effect.promise(() => release));
		let settled = false;

		const execution = runWithIdempotency(
			{ tenantId: TENANT_A, idempotencyKey: KEY, requestPayload: { a: 1 } },
			async () => Promise.reject(handlerError),
			svc,
		).finally(() => {
			settled = true;
		});

		await vi.waitFor(() => expect(svc._release).toHaveBeenCalledOnce());
		expect(svc._release).toHaveBeenCalledWith(
			TENANT_A,
			KEY,
			expect.any(String),
			expect.any(String),
		);
		expect(settled).toBe(false);
		finishRelease?.(true);
		await expect(execution).rejects.toBe(handlerError);
	});

	it("allows the key to be acquired again after a handler failure", async () => {
		const service = makeAtomicFakeService();
		const options = {
			tenantId: TENANT_A,
			idempotencyKey: KEY,
			requestPayload: { customerName: "Adi" },
		};

		await expect(
			runWithIdempotency(
				options,
				async () => Promise.reject(new Error("booking failed")),
				service,
			),
		).rejects.toThrow("booking failed");

		await expect(
			runWithIdempotency(
				options,
				async () => ({ bookingId: "B-retry" }),
				service,
			),
		).resolves.toEqual({ bookingId: "B-retry" });
	});

	it("rejects a concurrent matching request without executing its handler", async () => {
		const service = makeAtomicFakeService();
		let releaseFirst: ((value: { bookingId: string }) => void) | undefined;
		const firstResult = new Promise<{ bookingId: string }>((resolve) => {
			releaseFirst = resolve;
		});
		const firstHandler = vi.fn(() => firstResult);
		const concurrentHandler = vi.fn(async () => ({ bookingId: "duplicate" }));
		const options = {
			tenantId: TENANT_A,
			idempotencyKey: KEY,
			requestPayload: { customerName: "Adi" },
		};

		const first = runWithIdempotency(options, firstHandler, service);
		await vi.waitFor(() => expect(firstHandler).toHaveBeenCalledOnce());

		await expect(
			runWithIdempotency(options, concurrentHandler, service),
		).rejects.toMatchObject({
			name: "IdempotencyRequestInProgressError",
			code: "request_in_progress",
			status: 409,
		});
		expect(concurrentHandler).not.toHaveBeenCalled();

		releaseFirst?.({ bookingId: "B-concurrent" });
		await expect(first).resolves.toEqual({ bookingId: "B-concurrent" });
	});

	it("rejects a concurrent mismatched payload without executing its handler", async () => {
		const service = makeAtomicFakeService();
		let releaseFirst: ((value: { bookingId: string }) => void) | undefined;
		const firstResult = new Promise<{ bookingId: string }>((resolve) => {
			releaseFirst = resolve;
		});
		const firstHandler = vi.fn(() => firstResult);
		const concurrentHandler = vi.fn(async () => ({ bookingId: "duplicate" }));

		const first = runWithIdempotency(
			{
				tenantId: TENANT_A,
				idempotencyKey: KEY,
				requestPayload: { customerName: "Adi" },
			},
			firstHandler,
			service,
		);
		await vi.waitFor(() => expect(firstHandler).toHaveBeenCalledOnce());

		await expect(
			runWithIdempotency(
				{
					tenantId: TENANT_A,
					idempotencyKey: KEY,
					requestPayload: { customerName: "Budi" },
				},
				concurrentHandler,
				service,
			),
		).rejects.toMatchObject({
			name: "IdempotencyConflictError",
			code: "idempotency_conflict",
			status: 409,
		});
		expect(concurrentHandler).not.toHaveBeenCalled();

		releaseFirst?.({ bookingId: "B-original" });
		await expect(first).resolves.toEqual({ bookingId: "B-original" });
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

		svc._reserve.mockReturnValue(
			Effect.succeed({ _tag: "Completed", record: cached } as const),
		);

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
		expect(svc._complete).not.toHaveBeenCalled();
	});

	it("rejects key reuse with a different payload", async () => {
		const cachedHash = await hashIdempotencyPayload({ name: "Adi" });
		const svc = makeFakeService();
		svc._reserve.mockReturnValue(
			Effect.succeed({
				_tag: "Completed",
				record: {
					requestHash: cachedHash,
					responseBody: "{}",
					responseStatus: 200,
				},
			} as const),
		);

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

		svc._reserve.mockImplementation((tenantId: string) => {
			if (tenantId === TENANT_A) {
				return Effect.succeed({
					_tag: "Completed",
					record: {
						requestHash: cachedHash,
						responseBody: '{"x":1}',
						responseStatus: 200,
					},
				} as const);
			}
			return Effect.succeed({
				_tag: "Acquired",
				reservationCreatedAt: "2026-08-24T00:00:00.000Z",
			} as const);
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
