import { Schema } from "effect";
import {
	getActivePromoCodesProgram,
	validatePromoCodeProgram,
} from "@/domain/loyalty/loyalty.programs";
import { ValidatePromoCodeSchema } from "@/domain/loyalty/loyalty.schemas";
import {
	checkScope,
	validateApiKey,
	withRateLimitHeaders,
} from "@/infra/auth/api-auth";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId } from "@/shared/types/common.types";

const unauthorized = (): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: "Unauthorized: Invalid or missing API key.",
			}),
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			},
		),
	);

const forbidden = (): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: "Forbidden: API key missing required scope 'vouchers:read'",
			}),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		),
	);

const internalError = (): Response =>
	withRateLimitHeaders(
		new Response(
			JSON.stringify({
				success: false,
				error: "Internal Server Error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		),
	);

export const handleGetVouchers = async (
	request: Request,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
	if (!checkScope(validation, "vouchers:read")) return forbidden();

	try {
		const promos = await runApp(
			getActivePromoCodesProgram(validation.businessId as TTenantId),
		);

		const sanitized = promos.map((p) => ({
			code: p.code,
			name: p.name,
			description: p.description,
			type: p.type,
			value: p.value,
			minOrderAmount: p.minOrderAmount,
			maxDiscountAmount: p.maxDiscountAmount,
			validFrom: p.validFrom,
			validUntil: p.validUntil,
		}));

		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: true,
					data: sanitized,
					meta: { total: sanitized.length },
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	} catch (error) {
		console.error("[API v1 Vouchers] Error:", error);
		return internalError();
	}
};

export const handlePostValidateVoucher = async (
	request: Request,
): Promise<Response> => {
	const validation = await validateApiKey(request.headers.get("Authorization"));
	if (!validation) return unauthorized();
	if (!checkScope(validation, "vouchers:read")) return forbidden();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: Body must be valid JSON.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	let command: Schema.Schema.Type<typeof ValidatePromoCodeSchema>;
	try {
		command = Schema.decodeUnknownSync(ValidatePromoCodeSchema)(body);
	} catch (err) {
		return withRateLimitHeaders(
			new Response(
				JSON.stringify({
					success: false,
					error: "Bad Request: Schema validation failed.",
					details: err instanceof Error ? err.message : String(err),
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
	}

	try {
		const result = await runApp(
			validatePromoCodeProgram(command, validation.businessId as TTenantId),
		);

		return withRateLimitHeaders(
			new Response(JSON.stringify({ success: true, data: result }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
	} catch (error) {
		console.error("[API v1 Validate Voucher] Error:", error);
		return internalError();
	}
};
