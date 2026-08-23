// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { businesses } from "@/infra/db/drizzle/schema";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IAuditRepository } from "./audit.repository";
import { AuditRepositoryDrizzle } from "./audit.repository.drizzle";
import type { TAuditLog, TAuditLogId } from "./audit.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const auditRepoLayer = Layer.provide(AuditRepositoryDrizzle, DrizzleClientLive);

const run = <A, E>(effect: Effect.Effect<A, E, IAuditRepository>): Promise<A> =>
	Effect.runPromise(Effect.provide(effect, auditRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = () =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

const makeAuditLog = (
	tenantId: TTenantId,
	userId: TUserId,
	prefix: string,
): TAuditLog => {
	const now = new Date();
	return {
		id: generateId<TAuditLogId>(),
		tenantId,
		userId,
		action: "create",
		entityType: `${prefix}-entity`,
		entityId: generateId(),
		oldValue: null,
		newValue: { name: "new-name" },
		ipAddress: "127.0.0.1",
		userAgent: "vitest",
		createdAt: now,
	};
};

describe.skipIf(!hasDb)("audit repository drizzle (integration)", () => {
	const businessId = generateId<TTenantId>();
	const userId = generateId<TUserId>();
	const prefix = `__smoke_audit_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.insert(businesses).values({
			id: businessId,
			name: `${prefix} Test Business`,
			ownerId: userId,
		});
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM audit_logs WHERE business_id = ${businessId}`,
		);
		await db.delete(businesses).where(eq(businesses.id, businessId));
	});

	it("saves a new audit log and getStats counts it for the tenant", async () => {
		const log = makeAuditLog(businessId, userId, prefix);

		await run(
			Effect.gen(function* () {
				const repo = yield* IAuditRepository;
				yield* repo.save(log);
			}),
		);

		const stats = await run(
			Effect.gen(function* () {
				const repo = yield* IAuditRepository;
				return yield* repo.getStats(businessId);
			}),
		);

		expect(stats.total).toBeGreaterThanOrEqual(1);
	}, 15000);

	it("findAll returns tenant audit logs matching the entityType filter", async () => {
		const tag = `${prefix}-filter-target`;
		const log = {
			...makeAuditLog(businessId, userId, prefix),
			entityType: tag,
		};

		await run(
			Effect.gen(function* () {
				const repo = yield* IAuditRepository;
				yield* repo.save(log);
			}),
		);

		const page = await run(
			Effect.gen(function* () {
				const repo = yield* IAuditRepository;
				return yield* repo.findAll(businessId, { entityType: tag });
			}),
		);

		const mine = page.logs.filter((l) => l.entityType === tag);
		expect(mine.length).toBeGreaterThanOrEqual(1);
		expect(mine.every((l) => l.tenantId === businessId)).toBe(true);
		expect(page.total).toBeGreaterThanOrEqual(1);
	}, 15000);
});
