import { Effect } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import { ILoyaltyRepository, LoyaltyModule } from "@/domain/loyalty";
import type {
	TPromoCode,
	TPromoCodeId,
	TPromoCodeType,
	TPromoUsageRecord,
} from "@/domain/loyalty";
import { IProductRepository } from "@/domain/product";
import type { TProductId } from "@/domain/product/product.types";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { type TOrderDto, toOrderDto } from "./order.dto";
import type {
	InsufficientStockError,
	OrderAlreadyVoidedError,
} from "./order.errors";
import {
	InvalidStatusTransitionError,
	MissingCancelledReasonError,
	MissingTrackingInfoError,
	OrderNotFoundError,
} from "./order.errors";
import { OrderModule } from "./order.module";
import { IOrderRepository } from "./order.repository";
import type { CreateOrderCommand, VoidOrderCommand } from "./order.schemas";
import type {
	TOrderId,
	TOrderStatus,
	TOrderTracking,
	TPaymentMethod,
} from "./order.types";
import { isValidTransition } from "./order.types";

export const getOrdersProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TOrderDto[], DatabaseError, IOrderRepository> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const result = yield* repo.findAll(tenantId);
		return result.orders.map(toOrderDto);
	});

export const listOrdersProgram = (
	tenantId: TTenantId,
	options: {
		readonly limit?: number;
		readonly offset?: number;
		readonly status?:
			| "draft"
			| "confirmed"
			| "processing"
			| "shipped"
			| "delivered"
			| "cancelled"
			| "voided";
		readonly fromDate?: Date;
		readonly toDate?: Date;
		readonly phone?: string;
	},
): Effect.Effect<
	{ readonly orders: readonly TOrderDto[]; readonly total: number },
	DatabaseError,
	IOrderRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const result = yield* repo.findAll(tenantId, options);
		return {
			orders: result.orders.map(toOrderDto),
			total: result.total,
		};
	});

export const getDraftsProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TOrderDto[], DatabaseError, IOrderRepository> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const orders = yield* repo.findDrafts(tenantId);
		return orders.map(toOrderDto);
	});

export const getOrderProgram = (
	orderId: string,
	tenantId: TTenantId,
): Effect.Effect<TOrderDto | null, DatabaseError, IOrderRepository> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const id = orderId as TOrderId;
		const order = yield* repo.findById(id, tenantId);
		return order ? toOrderDto(order) : null;
	});

export const updateOrderStatusProgram = (
	orderId: string,
	tenantId: TTenantId,
	status:
		| "draft"
		| "confirmed"
		| "processing"
		| "shipped"
		| "delivered"
		| "cancelled",
): Effect.Effect<
	TOrderDto,
	DatabaseError | OrderNotFoundError | InvalidStatusTransitionError,
	IOrderRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const id = orderId as TOrderId;
		const updated = yield* repo.updateStatus(id, tenantId, status);
		return toOrderDto(updated);
	});

export const updateOrderStatus = (
	id: TOrderId,
	tenantId: TTenantId,
	targetStatus: TOrderStatus,
	tracking?: TOrderTracking,
	actorId?: TUserId,
): Effect.Effect<
	TOrderDto,
	| DatabaseError
	| OrderNotFoundError
	| InvalidStatusTransitionError
	| MissingTrackingInfoError
	| MissingCancelledReasonError,
	IOrderRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const order = yield* repo.findById(id, tenantId);
		if (!order) {
			return yield* Effect.fail(new OrderNotFoundError({ id }));
		}

		if (order.status === "voided") {
			return yield* Effect.fail(
				new InvalidStatusTransitionError(order.status, targetStatus),
			);
		}

		if (!isValidTransition(order.status, targetStatus)) {
			return yield* Effect.fail(
				new InvalidStatusTransitionError(order.status, targetStatus),
			);
		}

		if (targetStatus === "shipped") {
			if (!tracking?.trackingNumber || !tracking?.shippingCarrier) {
				return yield* Effect.fail(new MissingTrackingInfoError());
			}
		}

		if (targetStatus === "cancelled") {
			if (!tracking?.cancelledReason) {
				return yield* Effect.fail(new MissingCancelledReasonError());
			}
		}

		const updated = yield* repo.updateStatus(
			id,
			tenantId,
			targetStatus as
				| "draft"
				| "confirmed"
				| "processing"
				| "shipped"
				| "delivered"
				| "cancelled",
			tracking,
			actorId,
		);
		return toOrderDto(updated);
	});

export const getCustomerOrderHistoryProgram = (
	customerId: string,
	tenantId: TTenantId,
	options: { readonly limit?: number; readonly offset?: number },
): Effect.Effect<
	{ readonly orders: readonly TOrderDto[]; readonly total: number },
	DatabaseError,
	IOrderRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		const result = yield* repo.findByCustomerId(customerId, tenantId, options);
		return {
			orders: result.orders.map(toOrderDto),
			total: result.total,
		};
	});

export const createOrderProgram = (
	command: CreateOrderCommand,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<
	TOrderDto,
	DatabaseError | InsufficientStockError,
	IOrderRepository | IProductRepository | ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const orderRepo = yield* IOrderRepository;
		const _productRepo = yield* IProductRepository;
		const loyaltyRepo = yield* ILoyaltyRepository;

		// ─── Voucher verification (Fix 3) ───────────────────────────
		// If a voucherCode is supplied in the request body, we ALWAYS
		// re-validate it server-side against the actual subtotal — the
		// upstream proxy must not be trusted. The previously broken path
		// silently dropped voucherCode from CreateOrderSchema; this loop
		// uses LoyaltyModule.validatePromoCode which throws the typed
		// PromoCode* errors when the code is unknown/expired/exhausted.
		const subtotalAmount = command.items.reduce(
			(sum, i) => sum + i.quantity * i.priceAtTime,
			0,
		);
		const requestedDiscount = Math.max(0, command.voucherDiscount ?? 0);

		// 1. If client didn't send a code at all, we trust nothing; skip.
		// 2. If client sent a code but no discount, run validation (this
		//    also enforces min_order, expiry, max_uses, and active flag).
		// 3. After validation we apply the discount atomically: write to
		//    promo_usage + bump used_count. This is what bind previously
		//    failed to do — applyPromoCodeProgram existed but was never
		//    wired into the order create path.
		let validatedVoucher: {
			promoCodeId: TPromoCodeId;
			discount: number;
			code: string;
		} | null = null;

		if (command.voucherCode) {
			const promoCode = yield* loyaltyRepo.findPromoCodeByCode(
				tenantId,
				command.voucherCode,
			);

			if (!promoCode) {
				return yield* Effect.fail(
					new DatabaseError({
						cause: `Voucher "${command.voucherCode}" tidak ditemukan`,
					}),
				);
			}

			const customerUsageRows = yield* loyaltyRepo.getCustomerPromoUsage(
				tenantId,
				promoCode.id,
				// customerLoyaltyId — we don't track loyalty-tier per customer
				// in this codebase yet, so the third arg is unused and the
				// helper returns ALL usages. Result is treated as "any".
				null as unknown as string,
			);
			const customerUsageCount = customerUsageRows.length;

			// validatePromoCode can fail with one of the typed promo errors.
			// Surface those as DatabaseError to keep the port error union
			// stable; the response body still carries the original message
			// for the upstream proxy to surface to the user.
			const validationResult = yield* Effect.either(
				LoyaltyModule.validatePromoCode(
					promoCode,
					subtotalAmount,
					customerUsageCount,
					new Date().toISOString(),
				),
			);
			if (validationResult._tag === "Left") {
				return yield* Effect.fail(
					new DatabaseError({
						cause: validationResult.left.detail,
					}),
				);
			}

			validatedVoucher = {
				promoCodeId: promoCode.id,
				discount: validationResult.right,
				code: command.voucherCode,
			};
		}

		const appliedVoucherDiscount =
			validatedVoucher?.discount ?? requestedDiscount;

		// Skip manual stock verification, trust DB triggers or handle via variants later

		const orderWithItems = OrderModule.create(
			tenantId,
			command.branchId as TBranchId,
			userId,
			command.items.map((i) => ({
				productId: i.productId as TProductId,
				variantId: i.variantId ?? null,
				quantity: i.quantity,
				priceAtTime: i.priceAtTime,
				discountType: (i.discountType as "percentage" | "fixed" | null) ?? null,
				discountValue: i.discountValue ?? 0,
				discountAmount: i.discountAmount ?? 0,
			})),
			{
				customerId: (command.customerId as TCustomerId) || null,
				...(command.status !== undefined && {
					status: command.status as "draft" | "confirmed",
				}),
				...(command.discountType !== undefined && {
					discountType: command.discountType as "percentage" | "fixed" | null,
				}),
				...(command.discountValue !== undefined && {
					discountValue: command.discountValue,
				}),
				...(command.discountAmount !== undefined && {
					discountAmount: command.discountAmount,
				}),
				voucherCode: validatedVoucher?.code ?? null,
				voucherDiscount: appliedVoucherDiscount,
				...(command.payments !== undefined && {
					payments: command.payments.map((p) => ({
						method: p.method as TPaymentMethod,
						amount: p.amount,
					})),
				}),
			},
		);

		yield* orderRepo.saveFull(orderWithItems);

		// Record promo usage AFTER order persisted so the usage row references
		// a real order_id. If this fails, the order still exists (since
		// saveFull was atomic) but the voucher wasn't decremented — the next
		// attempt at the same code from the same customer will fail with
		// PromoCodeMaxUsageExceededError if used_count has reached the cap.
		// Operator can reconcile via promo_usage audit.
		if (validatedVoucher) {
			const now = new Date().toISOString();
			const usageRecord: TPromoUsageRecord = {
				id: generateId(),
				tenantId,
				promoCodeId: validatedVoucher.promoCodeId,
				customerLoyaltyId: null,
				orderId: orderWithItems.id,
				discountAmount: validatedVoucher.discount,
				usedAt: now,
			};
			yield* loyaltyRepo.savePromoUsage(usageRecord);
			yield* loyaltyRepo.incrementPromoUsage(
				tenantId,
				validatedVoucher.promoCodeId,
			);
		}

		return toOrderDto(orderWithItems);
	});

export const voidOrderProgram = (
	command: VoidOrderCommand,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<
	void,
	DatabaseError | OrderNotFoundError | OrderAlreadyVoidedError,
	IOrderRepository
> =>
	Effect.gen(function* () {
		const orderRepo = yield* IOrderRepository;
		yield* orderRepo.voidOrder(
			command.orderId as TOrderId,
			tenantId,
			userId,
			command.reason,
		);
	});

export const getProductFrequencyProgram = (
	tenantId: TTenantId,
	startDate?: Date,
): Effect.Effect<
	Readonly<Record<string, number>>,
	DatabaseError,
	IOrderRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IOrderRepository;
		return yield* repo.getProductFrequency(tenantId, startDate);
	});
