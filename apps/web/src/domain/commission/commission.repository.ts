import { Context, type Effect } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	CommissionRuleNotFoundError,
	KasbonNotFoundError,
} from "./commission.errors";
import type {
	TCommissionRecord,
	TCommissionRule,
	TCommissionRuleId,
	TKasbon,
	TKasbonPayment,
} from "./commission.types";

export interface ICommissionRepository {
	readonly findRuleByStaffId: (
		staffId: TStaffId,
		tenantId: TTenantId,
	) => Effect.Effect<TCommissionRule | null, DatabaseError>;

	readonly saveRule: (
		rule: Omit<TCommissionRule, "id" | "createdAt" | "updatedAt">,
	) => Effect.Effect<TCommissionRule, DatabaseError>;

	readonly updateRule: (
		id: TCommissionRuleId,
		tenantId: TTenantId,
		rule: Partial<
			Omit<TCommissionRule, "id" | "tenantId" | "createdAt" | "updatedAt">
		>,
	) => Effect.Effect<
		TCommissionRule,
		DatabaseError | CommissionRuleNotFoundError
	>;

	readonly findRecordsByStaffId: (
		staffId: TStaffId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TCommissionRecord[], DatabaseError>;

	readonly saveRecord: (
		record: Omit<
			TCommissionRecord,
			"id" | "createdAt" | "updatedAt" | "paidAt" | "status"
		>,
	) => Effect.Effect<TCommissionRecord, DatabaseError>;

	readonly markRecordsAsPaid: (
		staffId: TStaffId,
		tenantId: TTenantId,
	) => Effect.Effect<void, DatabaseError>;

	readonly findKasbonByStaffId: (
		staffId: TStaffId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TKasbon[], DatabaseError>;

	readonly saveKasbon: (
		kasbon: Omit<
			TKasbon,
			"id" | "createdAt" | "updatedAt" | "status" | "remaining"
		>,
	) => Effect.Effect<TKasbon, DatabaseError>;

	readonly addKasbonPayment: (
		payment: Omit<TKasbonPayment, "id" | "paidAt">,
		tenantId: TTenantId,
	) => Effect.Effect<TKasbonPayment, DatabaseError | KasbonNotFoundError>;
}

export const CommissionRepository = Context.GenericTag<ICommissionRepository>(
	"CommissionRepository",
);
