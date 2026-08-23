// @vitest-environment node
import { sql } from "drizzle-orm";
import { Context, Effect, Layer, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TStaffId } from "@/domain/staff/staff.types";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { type IShiftRepository, ShiftRepository } from "./shift.repository";
import { ShiftRepositoryDrizzle } from "./shift.repository.drizzle";
import type { TStaffScheduleId } from "./shift.types";

const hasDb = Boolean(process.env.DATABASE_URL);

const shiftRepoLayer = Layer.provide(ShiftRepositoryDrizzle, DrizzleClientLive);

const run = <A, E>(effect: Effect.Effect<A, E, IShiftRepository>) =>
	Effect.runPromise(Effect.provide(effect, shiftRepoLayer));

const runExit = <A, E>(effect: Effect.Effect<A, E, IShiftRepository>) =>
	Effect.runPromiseExit(Effect.provide(effect, shiftRepoLayer));

// `DrizzleClientLive` is now `Layer.scoped`; its pool closes once the scope it
// was built against closes. `Effect.provide(IDrizzleClient, DrizzleClientLive)`
// ties that scope to the lifetime of `IDrizzleClient` alone, which resolves
// instantly — so `getDb()` callers reusing the returned client afterward (as
// every test below does) need a shared, longer-lived scope instead of letting
// `Effect.provide` open-and-immediately-close one per call.
const dbScope = hasDb ? Effect.runSync(Scope.make()) : undefined;

const getDb = (): Promise<DrizzleClient> =>
	Effect.runPromise(
		Scope.extend(
			Effect.map(Layer.build(DrizzleClientLive), (context) =>
				Context.get(context, IDrizzleClient),
			),
			dbScope!,
		),
	);

describe.skipIf(!hasDb)("shift repository drizzle (integration)", () => {
	const tenantId = generateId<TTenantId>();
	const ownerId = generateId<string>();
	const staffId = generateId<TStaffId>();
	const prefix = `__smoke_shift_${Date.now()}`;
	const ownerEmail = `${prefix}_owner@example.com`;
	const staffEmail = `${prefix}_staff@example.com`;

	beforeAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		// staff_schedules.staff_id and staff_attendances.staff_id both FK to
		// profiles.user_id — so we need a user, a business owned by another
		// user, and a profile linking the staff user to that business.
		await db.execute(sql`
			INSERT INTO users (id, email, password_hash)
			VALUES (${ownerId}, ${ownerEmail}, 'pw')
			ON CONFLICT (email) DO NOTHING
		`);
		await db.execute(sql`
			INSERT INTO users (id, email, password_hash)
			VALUES (${staffId}, ${staffEmail}, 'pw')
			ON CONFLICT (email) DO NOTHING
		`);
		await db.execute(
			sql`INSERT INTO businesses (id, name, owner_id) VALUES (${tenantId}, ${`${prefix}_business`}, ${ownerId}) ON CONFLICT (id) DO NOTHING`,
		);
		await db.execute(sql`
			INSERT INTO profiles (user_id, business_id, full_name, email)
			VALUES (${staffId}, ${tenantId}, ${`${prefix}_staff`}, ${staffEmail})
			ON CONFLICT (user_id) DO NOTHING
		`);
	}, 20000);

	afterAll(async () => {
		if (!hasDb) return;
		const db = await getDb();
		await db.execute(
			sql`DELETE FROM staff_attendances WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM staff_schedules WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(
			sql`DELETE FROM profiles WHERE business_id = ${tenantId}::uuid`,
		);
		await db.execute(sql`DELETE FROM businesses WHERE id = ${tenantId}::uuid`);
		await db.execute(
			sql`DELETE FROM users WHERE email IN (${ownerEmail}, ${staffEmail})`,
		);
	}, 20000);

	it("creates a schedule, then finds it by staff id", async () => {
		const saved = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveSchedule({
						tenantId,
						staffId,
						dayOfWeek: 1,
						startTime: "08:00:00",
						endTime: "16:00:00",
						isOffDay: false,
					}),
				),
			),
		);

		expect(saved.id).toBeTruthy();
		expect(saved.dayOfWeek).toBe(1);
		expect(saved.startTime).toBe("08:00:00");
		expect(saved.endTime).toBe("16:00:00");
		expect(saved.isOffDay).toBe(false);

		const found = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findSchedulesByStaffId(staffId, tenantId),
				),
			),
		);
		const matching = found.find((s) => s.id === saved.id);
		expect(matching).toBeDefined();
		expect(matching?.dayOfWeek).toBe(1);
	}, 15000);

	it("upserts on (staff_id, day_of_week) conflict instead of throwing", async () => {
		const first = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveSchedule({
						tenantId,
						staffId,
						dayOfWeek: 2,
						startTime: "09:00:00",
						endTime: "17:00:00",
						isOffDay: false,
					}),
				),
			),
		);

		const second = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveSchedule({
						tenantId,
						staffId,
						dayOfWeek: 2,
						startTime: "10:00:00",
						endTime: "18:00:00",
						isOffDay: true,
					}),
				),
			),
		);

		expect(second.id).toBe(first.id);
		expect(second.startTime).toBe("10:00:00");
		expect(second.isOffDay).toBe(true);
	}, 15000);

	it("updates a schedule", async () => {
		const created = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveSchedule({
						tenantId,
						staffId,
						dayOfWeek: 3,
						startTime: "07:00:00",
						endTime: "15:00:00",
						isOffDay: false,
					}),
				),
			),
		);

		const updated = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.updateSchedule(created.id, tenantId, {
						startTime: "08:30:00",
						endTime: "16:30:00",
					}),
				),
			),
		);

		expect(updated.id).toBe(created.id);
		expect(updated.startTime).toBe("08:30:00");
		expect(updated.endTime).toBe("16:30:00");
	}, 15000);

	it("fails with StaffScheduleNotFoundError when updating a missing id", async () => {
		const missing = generateId() as TStaffScheduleId;
		const exit = await runExit(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.updateSchedule(missing, tenantId, {
						startTime: "08:00:00",
					}),
				),
			),
		);
		expect(exit._tag).toBe("Failure");
		if (exit._tag === "Failure") {
			const cause = JSON.stringify(exit.cause);
			expect(cause).toContain("StaffScheduleNotFoundError");
		}
	}, 15000);

	it("deletes a schedule, and is idempotent when missing", async () => {
		const created = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveSchedule({
						tenantId,
						staffId,
						dayOfWeek: 4,
						startTime: "08:00:00",
						endTime: "16:00:00",
						isOffDay: false,
					}),
				),
			),
		);

		await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) => repo.deleteSchedule(created.id, tenantId)),
			),
		);

		// `deleteSchedule` is documented as `Effect<void, DatabaseError>` —
		// unlike `updateSchedule`, no-op deletes must not surface a domain
		// error. Reproducing that contract here.
		await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) => repo.deleteSchedule(created.id, tenantId)),
			),
		);

		const found = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findSchedulesByStaffId(staffId, tenantId),
				),
			),
		);
		expect(found.find((s) => s.id === created.id)).toBeUndefined();
	}, 15000);

	it("records attendance (clock in), finds it by date, then clocks out via updateAttendance", async () => {
		const attendanceDate = "2024-06-15";
		const clockInAt = new Date("2024-06-15T08:05:00.000Z");
		const clockOutAt = new Date("2024-06-15T17:02:00.000Z");

		const saved = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.saveAttendance({
						tenantId,
						staffId,
						date: attendanceDate,
						clockIn: clockInAt,
						clockOut: null,
						notes: `${prefix} clock in`,
					}),
				),
			),
		);

		expect(saved.clockIn?.toISOString()).toBe(clockInAt.toISOString());
		expect(saved.clockOut).toBeNull();

		const fetched = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findAttendanceByDate(staffId, attendanceDate, tenantId),
				),
			),
		);
		expect(fetched?.id).toBe(saved.id);

		const updated = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.updateAttendance(saved.id, tenantId, {
						clockOut: clockOutAt,
						notes: `${prefix} clock out`,
					}),
				),
			),
		);
		expect(updated.clockOut?.toISOString()).toBe(clockOutAt.toISOString());
		expect(updated.notes).toBe(`${prefix} clock out`);
	}, 15000);

	it("returns null when no attendance exists for a given date", async () => {
		const someDate = "2024-01-01";
		const found = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findAttendanceByDate(staffId, someDate, tenantId),
				),
			),
		);
		expect(found).toBeNull();
	}, 15000);

	it("lists attendance rows in a date range, newest first", async () => {
		const d1 = "2023-03-01";
		const d2 = "2023-03-05";
		const d3 = "2023-03-10";
		const rangeMarker = `${prefix} range`;

		for (const [date, hours] of [
			[d1, 8],
			[d2, 7],
			[d3, 9],
		] as const) {
			await run(
				ShiftRepository.pipe(
					Effect.flatMap((repo) =>
						repo.saveAttendance({
							tenantId,
							staffId,
							date,
							clockIn: new Date(`${date}T0${hours}:00:00.000Z`),
							clockOut: null,
							notes: rangeMarker,
						}),
					),
				),
			);
		}

		const all = await run(
			ShiftRepository.pipe(
				Effect.flatMap((repo) =>
					repo.findAttendanceByDateRange(
						staffId,
						"2023-03-01",
						"2023-03-28",
						tenantId,
					),
				),
			),
		);
		const ours = all
			.filter((a) => a.notes === rangeMarker)
			.sort((a, b) => (a.date < b.date ? 1 : -1));
		expect(ours.map((a) => a.date)).toEqual([d3, d2, d1]);
	}, 20000);
});
