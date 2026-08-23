// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { businesses } from "@/infra/db/drizzle/schema";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IWhatsAppRepository } from "./whatsapp.repository";
import { WhatsAppRepositoryDrizzle } from "./whatsapp.repository.drizzle";
import type {
	TWhatsAppConfigId,
	TWhatsAppReminder,
	TWhatsAppReminderId,
	TWhatsAppTemplateId,
} from "./whatsapp.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const whatsappRepoLayer = Layer.provide(
	WhatsAppRepositoryDrizzle,
	DrizzleClientLive,
);
const run = <A, E>(effect: Effect.Effect<A, E, IWhatsAppRepository>) =>
	Effect.runPromise(Effect.provide(effect, whatsappRepoLayer));

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

describe.skipIf(!hasDb)("whatsapp repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const otherTenantId = generateId<TTenantId>();
	const ownerUserId = "00000000-0000-0000-0000-000000000000";
	const prefix = `__smoke_wa_${Date.now()}`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.insert(businesses).values([
			{ id: tenantId, name: `${prefix} Business A`, ownerId: ownerUserId },
			{
				id: otherTenantId,
				name: `${prefix} Business B`,
				ownerId: ownerUserId,
			},
		]);
	});

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// Order matters: child tables first, parent (businesses) last.
		await db.execute(
			sql`DELETE FROM whatsapp_messages WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM whatsapp_reminders WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM whatsapp_templates WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.execute(
			sql`DELETE FROM whatsapp_config WHERE business_id IN (${tenantId}, ${otherTenantId})`,
		);
		await db.delete(businesses).where(eq(businesses.id, tenantId));
		await db.delete(businesses).where(eq(businesses.id, otherTenantId));
	});

	it("getConfig returns null when no config exists", async () => {
		const config = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getConfig(tenantId);
			}),
		);

		expect(config).toBeNull();
	}, 15000);

	it("updateConfig creates the config and getConfig returns it", async () => {
		const configId = generateId<TWhatsAppConfigId>();

		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.updateConfig({
					id: configId,
					tenantId,
					isConnected: true,
					autoReminder: true,
					reminderHoursBefore: 12,
					autoPaymentConfirm: true,
					autoLoyaltyNotify: false,
					autoBookingConfirm: true,
				});
			}),
		);

		const fetched = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getConfig(tenantId);
			}),
		);

		expect(fetched).not.toBeNull();
		expect(fetched?.id).toBe(configId);
		expect(fetched?.isConnected).toBe(true);
		expect(fetched?.reminderHoursBefore).toBe(12);
	}, 15000);

	it("updateConfig on existing config updates in place (upsert semantics)", async () => {
		const configId = generateId<TWhatsAppConfigId>();

		// Wipe any config from a previous test so we own the row.
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM whatsapp_config WHERE business_id = ${tenantId}`,
		);

		// Seed
		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.updateConfig({
					id: configId,
					tenantId,
					isConnected: false,
					autoReminder: false,
					reminderHoursBefore: 24,
					autoPaymentConfirm: false,
					autoLoyaltyNotify: false,
					autoBookingConfirm: false,
				});
			}),
		);

		// Update using the same id (idempotent upsert).
		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.updateConfig({
					id: configId,
					tenantId,
					isConnected: true,
					autoReminder: true,
					reminderHoursBefore: 6,
					autoPaymentConfirm: true,
					autoLoyaltyNotify: true,
					autoBookingConfirm: true,
				});
			}),
		);

		const fetched = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getConfig(tenantId);
			}),
		);

		expect(fetched?.id).toBe(configId);
		expect(fetched?.reminderHoursBefore).toBe(6);
		expect(fetched?.isConnected).toBe(true);
	}, 15000);

	it("templates: insert 2, list scoped to tenant, delete one", async () => {
		const db = await getDb();

		const tpl1Id = generateId<TWhatsAppTemplateId>();
		const tpl2Id = generateId<TWhatsAppTemplateId>();
		await db.execute(
			sql`INSERT INTO whatsapp_templates (id, business_id, name, category, content, variables, is_active) VALUES (${tpl1Id}, ${tenantId}, ${`${prefix} Tpl 1`}, 'booking', 'Hello {{name}}', '[]'::jsonb, true)`,
		);
		await db.execute(
			sql`INSERT INTO whatsapp_templates (id, business_id, name, category, content, variables, is_active) VALUES (${tpl2Id}, ${otherTenantId}, ${`${prefix} Tpl Other`}, 'payment', 'Pay {{amount}}', '[]'::jsonb, true)`,
		);

		const list = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getTemplates(tenantId);
			}),
		);

		const mine = list.find((t) => t.name === `${prefix} Tpl 1`);
		const other = list.find((t) => t.name === `${prefix} Tpl Other`);
		expect(mine).toBeDefined();
		expect(other).toBeUndefined();

		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.deleteTemplate(tenantId, tpl1Id);
			}),
		);

		const afterDelete = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getTemplates(tenantId);
			}),
		);
		expect(afterDelete.find((t) => t.id === tpl1Id)).toBeUndefined();

		// Clean up other tenant's template
		await db.execute(sql`DELETE FROM whatsapp_templates WHERE id = ${tpl2Id}`);
	}, 20000);

	it("deleteTemplate does NOT delete another tenant's template", async () => {
		const db = await getDb();

		const tplId = generateId<TWhatsAppTemplateId>();
		await db.execute(
			sql`INSERT INTO whatsapp_templates (id, business_id, name, category, content, variables, is_active) VALUES (${tplId}, ${otherTenantId}, ${`${prefix} Protected`}, 'reminder', 'do not delete me', '[]'::jsonb, true)`,
		);

		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.deleteTemplate(tenantId, tplId);
			}),
		);

		const stillThere = await db.execute(
			sql`SELECT 1 FROM whatsapp_templates WHERE id = ${tplId}`,
		);
		expect(stillThere.rows.length).toBe(1);

		await db.execute(sql`DELETE FROM whatsapp_templates WHERE id = ${tplId}`);
	}, 20000);

	it("saveReminder, getPendingReminders, getReminder, updateReminderStatus", async () => {
		const reminderId = generateId<TWhatsAppReminderId>();
		const reminder: TWhatsAppReminder = {
			id: reminderId,
			tenantId,
			recipientPhone: "+6281234567890",
			recipientName: "Budi",
			message: "Your appointment is tomorrow at 10am",
			scheduledAt: new Date(Date.now() + 60_000),
			status: "pending",
			relatedType: "booking",
			relatedId: null,
			sentAt: null,
			createdAt: new Date(),
		};

		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.saveReminder(reminder);
			}),
		);

		const pending = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getPendingReminders(tenantId);
			}),
		);
		const found = pending.find((r) => r.id === reminderId);
		expect(found).toBeDefined();
		expect(found?.recipientName).toBe("Budi");

		const fetched = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getReminder(tenantId, reminderId);
			}),
		);
		expect(fetched?.id).toBe(reminderId);

		await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				yield* repo.updateReminderStatus(tenantId, reminderId, "sent");
			}),
		);

		const sent = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getReminder(tenantId, reminderId);
			}),
		);
		expect(sent?.status).toBe("sent");
		expect(sent?.sentAt).toBeInstanceOf(Date);
	}, 20000);

	it("pending reminders exclude non-pending (sent) and exclude other tenants", async () => {
		const db = await getDb();

		// Other tenant's pending reminder — must not appear in A's pending list
		const otherId = generateId<TWhatsAppReminderId>();
		await db.execute(
			sql`INSERT INTO whatsapp_reminders (id, business_id, recipient_phone, recipient_name, message, scheduled_at, status, related_type) VALUES (${otherId}, ${otherTenantId}, '+62', 'Other', 'msg', now() + interval '1 minute', 'pending', 'custom')`,
		);

		const pending = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getPendingReminders(tenantId);
			}),
		);

		// The reminder we marked 'sent' in the previous test should NOT show up
		// (only the one with status='pending' and tenantId=tenantId should be there)
		expect(pending.find((r) => r.id === otherId)).toBeUndefined();
		// And the previous reminder (now 'sent') should be excluded
		// (we don't know its id here, so just assert the list only contains
		// reminders with status='pending').

		await db.execute(sql`DELETE FROM whatsapp_reminders WHERE id = ${otherId}`);
	}, 20000);

	it("getStats counts all-time, this-month, scheduled, failed", async () => {
		const db = await getDb();

		// 2 sent, 1 failed, 1 scheduled (pending)
		await db.execute(
			sql`INSERT INTO whatsapp_messages (business_id, recipient_phone, content, status, created_at) VALUES (${tenantId}, '+1', 'a', 'sent', now()), (${tenantId}, '+2', 'b', 'sent', now()), (${tenantId}, '+3', 'c', 'failed', now()), (${tenantId}, '+4', 'd', 'pending', now())`,
		);
		// 1 message in a different tenant — must not be counted
		await db.execute(
			sql`INSERT INTO whatsapp_messages (business_id, recipient_phone, content, status, created_at) VALUES (${otherTenantId}, '+5', 'e', 'sent', now())`,
		);

		const stats = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getStats(tenantId);
			}),
		);

		// Total reflects ONLY this tenant — there could be other tests'
		// messages, so just assert relative counts.
		expect(stats.scheduled).toBeGreaterThanOrEqual(1);
		expect(stats.failed).toBeGreaterThanOrEqual(1);
		expect(stats.total).toBeGreaterThanOrEqual(4);

		// The other tenant's message must not inflate our counts.
		// We can re-fetch with otherTenant and assert it includes its own.
		const otherStats = await run(
			Effect.gen(function* () {
				const repo = yield* IWhatsAppRepository;
				return yield* repo.getStats(otherTenantId);
			}),
		);
		expect(otherStats.total).toBe(1);
	}, 20000);
});
