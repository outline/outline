import { Effect, Layer, ManagedRuntime } from "effect";
import { AccountingRepositoryDrizzle } from "@/domain/accounting/accounting.repository.drizzle";
import { AuditRepositoryDrizzle } from "@/domain/audit/audit.repository.drizzle";
import { BillingRepositoryDrizzle } from "@/domain/billing/billing.repository.drizzle";
import { BoardingRepositoryDrizzle } from "@/domain/boarding/boarding.repository.drizzle";
import { BranchRepositoryDrizzle } from "@/domain/branch/branch.repository.drizzle";
import { CommissionRepositoryDrizzle } from "@/domain/commission/commission.repository.drizzle";
import { CustomerRepositoryDrizzle } from "@/domain/customer/customer.repository.drizzle";
import { DashboardRepositoryDrizzle } from "@/domain/dashboard/dashboard.repository.drizzle";
import { DocumentTemplateRepositoryDrizzle } from "@/domain/document-template/document-template.repository.drizzle";
import { FormBuilderRepositoryDrizzle } from "@/domain/form-builder/form-builder.repository.drizzle";
import { GroomingRepositoryDrizzle } from "@/domain/grooming/grooming.repository.drizzle";
import { ApiKeyRepositoryDrizzleLive } from "@/domain/identity/api-key/api-key.repository.drizzle";
import { AuthRepositoryDrizzle } from "@/domain/identity/auth/auth.repository.drizzle";
import { IdentityRepositoryDrizzle } from "@/domain/identity/identity.repository.drizzle";
import { PasswordResetRepositoryDrizzle } from "@/domain/identity/password-reset/password-reset.repository.drizzle";
import { InventoryRepositoryDrizzle } from "@/domain/inventory/inventory.repository.drizzle";
import { InvoiceRepositoryDrizzle } from "@/domain/invoice/invoice.repository.drizzle";
import { LoyaltyRepositoryDrizzle } from "@/domain/loyalty/loyalty.repository.drizzle";
import { OrderRepositoryDrizzle } from "@/domain/order/order.repository.drizzle";
import { PetRepositoryDrizzle } from "@/domain/pet/pet.repository.drizzle";
import { PortalRepositoryDrizzle } from "@/domain/portal/portal.repository.drizzle";
import { ProductRepositoryDrizzle } from "@/domain/product/product.repository.drizzle";
import { PublicRepositoryDrizzle } from "@/domain/public/public.repository.drizzle";
import { PurchaseOrderRepositoryDrizzle } from "@/domain/purchase-order/purchase-order.repository.drizzle";
import { ReturnRepositoryDrizzle } from "@/domain/return/return.repository.drizzle";
import { RoomRepositoryDrizzle } from "@/domain/room/room.repository.drizzle";
import { ShiftRepositoryDrizzle } from "@/domain/shift/shift.repository.drizzle";
import { StaffRepositoryDrizzle } from "@/domain/staff/staff.repository.drizzle";
import { SupplierRepositoryDrizzle } from "@/domain/supplier/supplier.repository.drizzle";
import { WarehouseRepositoryDrizzle } from "@/domain/warehouse/warehouse.repository.drizzle";
import { WebhookRepositoryDrizzle } from "@/domain/webhook/webhook.repository.drizzle";
import { WhatsAppRepositoryDrizzle } from "@/domain/whatsapp/whatsapp.repository.drizzle";
import { AnisAiWhatsAppAdapterLive } from "@/infra/adapters/anis-ai.adapter";
import { DrizzleQueueAdapterLive } from "@/infra/adapters/drizzle.queue";
import { ProviderEmailAdapterLive } from "@/infra/adapters/email/provider-email.adapter";
import { IdempotencyDrizzleLive } from "@/infra/adapters/idempotency.drizzle";
import { MidtransPaymentAdapterLive } from "@/infra/adapters/midtrans.adapter";
import { EmberStorageAdapterLive } from "@/infra/adapters/ember.adapter";
import { UpstashRateLimitAdapterLive } from "@/infra/adapters/rate-limit/upstash-rate-limit.adapter";
import { UpstashCacheAdapterLive } from "@/infra/adapters/upstash.adapter";
import {
	DrizzleClientLive,
	type IDrizzleClient,
} from "@/infra/db/drizzle/client";
import { AppConfigLive } from "@/shared/env/app.config";
import { devLog } from "@/shared/utils/dev-logger";

const BaseServicesLayer = Layer.mergeAll(AppConfigLive);

const AdaptersLayer = Layer.provideMerge(
	Layer.mergeAll(
		UpstashCacheAdapterLive,
		MidtransPaymentAdapterLive,
		AnisAiWhatsAppAdapterLive,
		EmberStorageAdapterLive,
		DrizzleQueueAdapterLive,
		IdempotencyDrizzleLive,
		ProviderEmailAdapterLive,
		UpstashRateLimitAdapterLive,
	),
	BaseServicesLayer,
);

const RepositoriesLayer = Layer.provideMerge(
	Layer.mergeAll(
		ProductRepositoryDrizzle,
		PetRepositoryDrizzle,
		CommissionRepositoryDrizzle,
		InventoryRepositoryDrizzle,
		ShiftRepositoryDrizzle,
		BoardingRepositoryDrizzle,
		BranchRepositoryDrizzle,
		OrderRepositoryDrizzle,
		StaffRepositoryDrizzle,
		AccountingRepositoryDrizzle,
		BillingRepositoryDrizzle,
		IdentityRepositoryDrizzle,
		AuthRepositoryDrizzle,
		PasswordResetRepositoryDrizzle,
		AuditRepositoryDrizzle,
		LoyaltyRepositoryDrizzle,
		PortalRepositoryDrizzle,
		WhatsAppRepositoryDrizzle,
		CustomerRepositoryDrizzle,
		DashboardRepositoryDrizzle,
		DocumentTemplateRepositoryDrizzle,
		FormBuilderRepositoryDrizzle,
		GroomingRepositoryDrizzle,
		RoomRepositoryDrizzle,
		SupplierRepositoryDrizzle,
		WarehouseRepositoryDrizzle,
		PublicRepositoryDrizzle,
		PurchaseOrderRepositoryDrizzle,
		ReturnRepositoryDrizzle,
		InvoiceRepositoryDrizzle,
		ApiKeyRepositoryDrizzleLive,
		WebhookRepositoryDrizzle,
	),
	AdaptersLayer,
);

export const AppLayer = RepositoriesLayer;

export const AppRuntime = ManagedRuntime.make(
	AppLayer as Parameters<typeof ManagedRuntime.make>[0],
);

export const runApp = <
	A,
	E,
	R extends Layer.Layer.Success<typeof AppLayer> | IDrizzleClient,
>(
	effect: Effect.Effect<A, E, R>,
): Promise<A> => {
	const requestLayer = DrizzleClientLive;
	const fullLayer = Layer.provideMerge(AppLayer, requestLayer);

	return (
		Effect.runPromise(
			Effect.provide(effect, fullLayer) as Effect.Effect<A>,
		) as Promise<A>
	).catch((e) => {
		devLog.effectError("runApp", e);

		if (e && typeof e === "object") {
			let extractedMessage: string | null = null;
			try {
				const toJSON = (e as Record<string, unknown>)?.toJSON as
					| (() => Record<string, unknown>)
					| undefined;
				const jsonResult = toJSON?.();
				const failure = jsonResult?.cause as
					| Record<string, unknown>
					| undefined;
				const realCause =
					failure?.failure ||
					(e as Record<string, unknown>)?.failure ||
					failure?.cause ||
					(e as Record<string, unknown>)?.cause;

				if (realCause) {
					let rawMessage: string | null = null;

					if (realCause instanceof Error) {
						rawMessage = realCause.message;
					} else if (
						typeof realCause === "object" &&
						realCause !== null &&
						"message" in realCause
					) {
						rawMessage = String((realCause as Record<string, unknown>).message);
					} else if (typeof realCause === "string") {
						rawMessage = realCause;
					}

					if (rawMessage) {
						if (
							rawMessage.startsWith("{") &&
							rawMessage.includes('"message"')
						) {
							try {
								const parsed = JSON.parse(rawMessage);
								if (parsed && typeof parsed === "object" && parsed.message) {
									extractedMessage = String(parsed.message);
								}
							} catch {}
						}

						if (!extractedMessage) {
							extractedMessage = rawMessage;
						}
					}
				}

				if (!extractedMessage) {
					const causeStr = JSON.stringify(e);
					const msgMatch = causeStr.match(/"message":"([^"]+)"/);
					if (msgMatch?.[1]) {
						extractedMessage = msgMatch[1];
					}
				}
			} catch {}

			if (extractedMessage) {
				throw new Error(extractedMessage);
			}
		}
		throw e;
	});
};
