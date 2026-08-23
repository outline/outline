import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TCustomerLoyalty,
	TCustomerLoyaltyId,
	TLoyaltyConfig,
	TLoyaltyTier,
	TPointsTransaction,
	TPointsTransactionId,
	TPromoCode,
	TPromoCodeId,
	TPromoUsageRecord,
} from "./loyalty.types";

export class ILoyaltyRepository extends Context.Tag("ILoyaltyRepository")<
	ILoyaltyRepository,
	{
		readonly getConfig: (
			tenantId: TTenantId,
		) => Effect.Effect<TLoyaltyConfig | null, DatabaseError>;
		readonly getTiers: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TLoyaltyTier[], DatabaseError>;
		readonly findCustomerByPhone: (
			tenantId: TTenantId,
			phone: string,
		) => Effect.Effect<TCustomerLoyalty | null, DatabaseError>;
		readonly findCustomerById: (
			tenantId: TTenantId,
			customerId: string,
		) => Effect.Effect<TCustomerLoyalty | null, DatabaseError>;
		readonly updateConfig: (
			config: TLoyaltyConfig,
		) => Effect.Effect<void, DatabaseError>;
		readonly updateCustomerPoints: (
			tenantId: TTenantId,
			customerLoyaltyId: string,
			totalPoints: number,
		) => Effect.Effect<void, DatabaseError>;
		readonly savePointsTransaction: (
			transaction: TPointsTransaction,
		) => Effect.Effect<void, DatabaseError>;
		readonly getPointsTransactions: (
			tenantId: TTenantId,
			customerLoyaltyId: string,
		) => Effect.Effect<readonly TPointsTransaction[], DatabaseError>;
		readonly getAllPointsTransactions: (
			tenantId: TTenantId,
		) => Effect.Effect<
			readonly {
				readonly transaction: TPointsTransaction;
				readonly customerId: string | null;
				readonly customerName: string;
			}[],
			DatabaseError
		>;
		/**
		 * Atomically inserts a points transaction AND updates the
		 * customer_loyalty balance in a single Postgres transaction.
		 * Replaces the previous two-call pattern
		 * (savePointsTransaction + updateCustomerPoints) which was
		 * vulnerable to partial-failure inconsistency.
		 */
		readonly atomicEarnPoints: (
			params: AtomicEarnPointsParams,
		) => Effect.Effect<number, DatabaseError>;
		/**
		 * Atomically inserts a 'redeem' transaction AND decrements
		 * the customer_loyalty balance in a single Postgres
		 * transaction. Raises DatabaseError if the customer does
		 * not have enough available points.
		 */
		readonly atomicRedeemPoints: (
			params: AtomicRedeemPointsParams,
		) => Effect.Effect<number, DatabaseError>;

		/** Promo codes */
		readonly getPromoCodes: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TPromoCode[], DatabaseError>;
		readonly getActivePromoCodes: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TPromoCode[], DatabaseError>;
		readonly findPromoCodeByCode: (
			tenantId: TTenantId,
			code: string,
		) => Effect.Effect<TPromoCode | null, DatabaseError>;
		readonly createPromoCode: (
			promoCode: TPromoCode,
		) => Effect.Effect<void, DatabaseError>;
		readonly updatePromoCode: (
			promoCode: TPromoCode,
		) => Effect.Effect<void, DatabaseError>;
		readonly incrementPromoUsage: (
			tenantId: TTenantId,
			promoCodeId: TPromoCodeId,
		) => Effect.Effect<void, DatabaseError>;
		readonly getCustomerPromoUsage: (
			tenantId: TTenantId,
			promoCodeId: TPromoCodeId,
			customerLoyaltyId: string,
		) => Effect.Effect<readonly TPromoUsageRecord[], DatabaseError>;
		readonly savePromoUsage: (
			record: TPromoUsageRecord,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}

export type AtomicEarnPointsParams = {
	readonly tenantId: TTenantId;
	readonly customerLoyaltyId: TCustomerLoyaltyId;
	readonly transactionId: TPointsTransactionId;
	readonly points: number;
	readonly orderId?: string | null;
	readonly description?: string | null;
};

export type AtomicRedeemPointsParams = {
	readonly tenantId: TTenantId;
	readonly customerLoyaltyId: TCustomerLoyaltyId;
	readonly transactionId: TPointsTransactionId;
	readonly points: number;
	readonly orderId?: string | null;
	readonly description?: string | null;
};
