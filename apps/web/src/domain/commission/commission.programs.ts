import { Effect, Schema } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import {
	createCommissionRule,
	createKasbon,
	createKasbonPayment,
	updateCommissionRuleData,
} from "./commission.module";
import { CommissionRepository } from "./commission.repository";
import {
	CreateCommissionRuleSchema,
	CreateKasbonSchema,
	PayKasbonSchema,
	UpdateCommissionRuleSchema,
} from "./commission.schemas";
import type { TCommissionRuleId } from "./commission.types";

export const getCommissionRuleByStaffProgram = (
	tenantId: TTenantId,
	staffId: TStaffId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		return yield* _(repo.findRuleByStaffId(staffId, tenantId));
	});

export const addCommissionRuleProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		const parsed = yield* _(
			Schema.decodeUnknown(CreateCommissionRuleSchema)(data),
		);

		const ruleEntity = yield* _(createCommissionRule(tenantId, parsed));
		return yield* _(repo.saveRule(ruleEntity));
	});

export const updateCommissionRuleProgram = (
	tenantId: TTenantId,
	data: unknown,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		const parsed = yield* _(
			Schema.decodeUnknown(UpdateCommissionRuleSchema)(data),
		);

		const updates = yield* _(updateCommissionRuleData(parsed));
		return yield* _(
			repo.updateRule(parsed.id as TCommissionRuleId, tenantId, updates),
		);
	});

export const getCommissionRecordsByStaffProgram = (
	tenantId: TTenantId,
	staffId: TStaffId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		return yield* _(repo.findRecordsByStaffId(staffId, tenantId));
	});

export const payCommissionsProgram = (tenantId: TTenantId, staffId: TStaffId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		return yield* _(repo.markRecordsAsPaid(staffId, tenantId));
	});

export const getKasbonByStaffProgram = (
	tenantId: TTenantId,
	staffId: TStaffId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		return yield* _(repo.findKasbonByStaffId(staffId, tenantId));
	});

export const addKasbonProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		const parsed = yield* _(Schema.decodeUnknown(CreateKasbonSchema)(data));

		const kasbonEntity = yield* _(createKasbon(tenantId, parsed));
		return yield* _(repo.saveKasbon(kasbonEntity));
	});

export const payKasbonProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(CommissionRepository);
		const parsed = yield* _(Schema.decodeUnknown(PayKasbonSchema)(data));

		const paymentEntity = yield* _(createKasbonPayment(parsed));
		return yield* _(repo.addKasbonPayment(paymentEntity, tenantId));
	});
