import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TPaymentError } from "@/shared/ports";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	type TBillingEventDto,
	type TPaymentResultDto,
	type TSubscriptionDto,
	toBillingEventDto,
	toSubscriptionDto,
} from "./billing.dto";
import { BillingEventNotFoundError } from "./billing.errors";
import { BillingModule } from "./billing.module";
import { IBillingRepository, IPaymentProvider } from "./billing.repository";
import type {
	CreatePaymentCommand,
	PaymentCallbackCommand,
} from "./billing.schemas";
import type {
	TBillingCycle,
	TBillingEvent,
	TBillingEventId,
	TSubscriptionPlan,
	TUsageMetrics,
} from "./billing.types";

export const getUsageMetricsProgram = (
	tenantId: TTenantId,
): Effect.Effect<TUsageMetrics, DatabaseError, IBillingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBillingRepository;
		return yield* repo.getUsageMetrics(tenantId);
	});

export const getCurrentSubscriptionProgram = (
	tenantId: TTenantId,
): Effect.Effect<TSubscriptionDto | null, DatabaseError, IBillingRepository> =>
	Effect.gen(function* () {
		const repo = yield* IBillingRepository;
		const sub = yield* repo.findSubscriptionByTenantId(tenantId);
		return sub ? toSubscriptionDto(sub) : null;
	});

export const getBillingHistoryProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TBillingEventDto[],
	DatabaseError,
	IBillingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBillingRepository;
		const events = yield* repo.getHistory(tenantId);
		return events.map(toBillingEventDto);
	});

export const createSubscriptionPaymentProgram = (
	command: CreatePaymentCommand,
	tenantId: TTenantId,
	userId: TUserId,
	customer: { name: string; email: string },
): Effect.Effect<
	TPaymentResultDto,
	DatabaseError | TPaymentError,
	IBillingRepository | IPaymentProvider
> =>
	Effect.gen(function* () {
		const billingRepo = yield* IBillingRepository;
		const paymentProvider = yield* IPaymentProvider;

		const amount = BillingModule.calculateAmount(
			command.plan as TSubscriptionPlan,
			command.billingCycle as TBillingCycle,
		);
		const orderId = `SUB-${tenantId.slice(0, 8)}-${Date.now()}`;

		const event: TBillingEvent = {
			id: generateId() as TBillingEventId,
			tenantId,
			eventType: "subscription_created",
			plan: command.plan as TSubscriptionPlan,
			amount,
			currency: "IDR",
			externalOrderId: orderId,
			externalTransactionId: null,
			status: "pending",
			metadata: { billingCycle: command.billingCycle, userId },
			createdAt: new Date(),
		};

		yield* billingRepo.saveEvent(event);

		const result = yield* paymentProvider.createTransaction({
			orderId,
			amount,
			customer,
			items: [
				{
					id: command.plan,
					name: `Petso ${command.plan} (${command.billingCycle})`,
					price: amount,
					quantity: 1,
				},
			],
		});

		return {
			orderId,
			snapToken: result.token,
			redirectUrl: result.redirectUrl,
		};
	});

export const handlePaymentCallbackProgram = (
	command: PaymentCallbackCommand,
	tenantId: TTenantId,
): Effect.Effect<
	{ success: boolean; status: string },
	DatabaseError | BillingEventNotFoundError,
	IBillingRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IBillingRepository;

		const event = yield* repo.findEventByOrderId(command.orderId);
		if (!event)
			return yield* Effect.fail(
				new BillingEventNotFoundError({ orderId: command.orderId }),
			);

		const result = yield* repo.atomicApplyPaymentCallback({
			tenantId,
			orderId: command.orderId,
			transactionId: command.transactionId ?? null,
			transactionStatus: command.transactionStatus ?? null,
			paymentMethod: command.paymentMethod ?? null,
		});

		return { success: result.status === "success", status: result.status };
	});
