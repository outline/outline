import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { WebhookModule } from "./webhook.module";
import { IWebhookRepository } from "./webhook.repository";
import type { CreateWebhookEndpointCommand } from "./webhook.schemas";
import type { TWebhookEndpoint, TWebhookEvent } from "./webhook.types";

export type TCreateWebhookResult = {
	readonly endpoint: TWebhookEndpoint;
	readonly secret: string;
};

export const listWebhooksProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TWebhookEndpoint[],
	DatabaseError,
	IWebhookRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IWebhookRepository;
		const endpoints = yield* repo.findAllByBusiness(tenantId);
		return endpoints.map(stripSecret);
	});

export const createWebhookProgram = (
	tenantId: TTenantId,
	command: CreateWebhookEndpointCommand,
): Effect.Effect<TCreateWebhookResult, DatabaseError, IWebhookRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWebhookRepository;
		const secret = WebhookModule.generateSecret();
		const events = (command.events ?? [
			"order.created",
		]) as readonly TWebhookEvent[];
		const endpoint = WebhookModule.create({
			tenantId,
			url: command.url,
			secret,
			events,
			isActive: true,
			description: command.description ?? null,
		});
		yield* repo.save(endpoint);
		return { endpoint, secret };
	});

export const revokeWebhookProgram = (
	id: string,
	tenantId: TTenantId,
): Effect.Effect<boolean, DatabaseError, IWebhookRepository> =>
	Effect.gen(function* () {
		const repo = yield* IWebhookRepository;
		const existing = yield* repo.findById(
			id as TWebhookEndpoint["id"],
			tenantId,
		);
		if (!existing) return false;
		yield* repo.revoke(existing.id, tenantId);
		return true;
	});

const stripSecret = (endpoint: TWebhookEndpoint): TWebhookEndpoint => ({
	...endpoint,
	secret: endpoint.revokedAt ? endpoint.secret : "***",
});
