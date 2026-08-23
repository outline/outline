import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { aiGetBusinessSnapshotProgram } from "@/domain/ai/ai.programs";
import { IAuditRepository } from "@/domain/audit/audit.repository";
import type { TAuditLog, TAuditLogId } from "@/domain/audit/audit.types";
import { getBoardingsProgram } from "@/domain/boarding/boarding.programs";
import { createOrderProgram } from "@/domain/order/order.programs";
import { CreateOrderSchema } from "@/domain/order/order.schemas";
import { getProductsProgram } from "@/domain/product/product.programs";
import { inviteStaffProgram } from "@/domain/staff/staff.programs";
import { InviteStaffSchema } from "@/domain/staff/staff.schemas";
import { timingSafeEqual } from "@/infra/auth/api-auth";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { profiles } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import { getServerEnv } from "@/shared/env/app.config";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

const MAX_BODY_BYTES = 128_1024;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (ip: string): boolean => {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);
	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return true;
	}
	entry.count++;
	if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
		return false;
	}
	return true;
};

type TToolHandler = (
	args: Record<string, unknown> | undefined,
) => Promise<unknown>;

type TToolDef = {
	readonly name: string;
	readonly description: string;
	readonly inputSchema: Record<string, unknown>;
	readonly handler: TToolHandler;
	readonly isWrite: boolean;
};

const buildTools = (mcpBusinessId: string): readonly TToolDef[] => {
	const tenantId = mcpBusinessId as TTenantId;
	return [
		{
			name: "get_business_snapshot",
			description:
				"Get key business metrics, inventory summary, and active boardings.",
			inputSchema: { type: "object", properties: {} },
			isWrite: false,
			handler: async () => {
				const program = aiGetBusinessSnapshotProgram(tenantId);
				return await runApp(program);
			},
		},
		{
			name: "list_products",
			description:
				"List all products catalog, variants, prices, and stock inventory.",
			inputSchema: { type: "object", properties: {} },
			isWrite: false,
			handler: async () => {
				const program = getProductsProgram(tenantId);
				return await runApp(program);
			},
		},
		{
			name: "list_boardings",
			description: "List all active and scheduled pet boardings history.",
			inputSchema: { type: "object", properties: {} },
			isWrite: false,
			handler: async () => {
				const program = getBoardingsProgram(tenantId);
				return await runApp(program);
			},
		},
		{
			name: "create_order",
			description:
				"Create a new POS or eCommerce order with products and payments.",
			inputSchema: {
				type: "object",
				properties: {
					branchId: { type: "string", description: "Target branch UUID" },
					customerId: { type: "string", description: "Optional customer UUID" },
					items: {
						type: "array",
						items: {
							type: "object",
							properties: {
								productId: { type: "string" },
								quantity: { type: "number" },
								priceAtTime: { type: "number" },
							},
							required: ["productId", "quantity", "priceAtTime"],
						},
					},
					payments: {
						type: "array",
						items: {
							type: "object",
							properties: {
								method: {
									type: "string",
									description: "qris, cash, card, transfer",
								},
								amount: { type: "number" },
							},
							required: ["method", "amount"],
						},
					},
				},
				required: ["branchId", "items"],
			},
			isWrite: true,
			handler: async (args) => {
				const command = Schema.decodeUnknownSync(CreateOrderSchema)(args);
				const systemUserId = await runApp(
					Effect.gen(function* () {
						const db = yield* IDrizzleClient;
						const [profile] = yield* Effect.tryPromise({
							try: () =>
								db
									.select()
									.from(profiles)
									.where(eq(profiles.businessId, mcpBusinessId))
									.limit(1),
							catch: (e) => e,
						});
						return profile?.userId ?? null;
					}),
				);
				if (!systemUserId) {
					throw new Error("Failed to resolve a system creator user.");
				}
				const result = await runApp(
					createOrderProgram(command, tenantId, systemUserId as TUserId),
				);
				return `Order created successfully: ${JSON.stringify(result, null, 2)}`;
			},
		},
		{
			name: "invite_staff",
			description:
				"Invite or register a new staff member (kasir, manager, staff_daycare) to a branch.",
			inputSchema: {
				type: "object",
				properties: {
					email: { type: "string", description: "Staff email address" },
					branchId: { type: "string", description: "Branch UUID" },
					role: {
						type: "string",
						description: "kasir, manager, staff_daycare",
					},
				},
				required: ["email", "branchId", "role"],
			},
			isWrite: true,
			handler: async (args) => {
				const command = Schema.decodeUnknownSync(InviteStaffSchema)(args);
				await runApp(inviteStaffProgram(command, tenantId));
				return `Staff member invited successfully: ${command.email} as ${command.role}`;
			},
		},
	];
};

type TJsonRpcRequest = {
	readonly jsonrpc: string;
	readonly id?: string | number;
	readonly method: string;
	readonly params?: unknown;
};

const jsonRpcSuccess = (id: string | number | null, result: unknown) =>
	new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});

const jsonRpcError = (
	id: string | number | null,
	code: number,
	message: string,
	status = 400,
) =>
	new Response(
		JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
		{
			status,
			headers: { "Content-Type": "application/json" },
		},
	);

const getClientIp = (request: Request): string =>
	request.headers.get("CF-Connecting-IP") ??
	request.headers.get("X-Forwarded-For") ??
	"unknown";

export const handlePostMcp = async (
	request: Request,
	workerEnv?: unknown,
): Promise<Response> => {
	const ip = getClientIp(request);
	if (!checkRateLimit(ip)) {
		return jsonRpcError(null, -32000, "Rate limit exceeded", 429);
	}

	const contentLength = parseInt(
		request.headers.get("Content-Length") ?? "0",
		10,
	);
	if (contentLength > MAX_BODY_BYTES) {
		return jsonRpcError(null, -32000, "Request too large", 413);
	}

	const authHeader = request.headers.get("Authorization");
	const serverEnv = getServerEnv(workerEnv);
	const secretToken = serverEnv.mcpSecretToken;
	const mcpBusinessId = serverEnv.mcpBusinessId;

	if (!secretToken || !authHeader?.startsWith("Bearer ")) {
		return jsonRpcError(null, -32001, "Unauthorized", 401);
	}

	const providedToken = authHeader.substring(7).trim();
	if (!timingSafeEqual(providedToken, secretToken)) {
		return jsonRpcError(null, -32001, "Unauthorized", 401);
	}

	if (!mcpBusinessId) {
		return jsonRpcError(null, -32603, "MCP Business ID not configured", 500);
	}

	let body: TJsonRpcRequest;
	try {
		const text = await request.text();
		if (text.length > MAX_BODY_BYTES) {
			return jsonRpcError(null, -32000, "Request too large", 413);
		}
		body = JSON.parse(text) as TJsonRpcRequest;
	} catch {
		return jsonRpcError(null, -32700, "Parse error");
	}

	const id = body.id ?? null;
	const { method, params } = body;

	if (method === "notifications/initialized") {
		return jsonRpcSuccess(id, {});
	}

	if (method === "initialize") {
		return jsonRpcSuccess(id, {
			protocolVersion: "2024-11-05",
			capabilities: {
				tools: {},
			},
			serverInfo: {
				name: "pet-store-mcp",
				version: "1.0.0",
			},
		});
	}

	const tools = buildTools(mcpBusinessId);

	if (method === "tools/list") {
		return jsonRpcSuccess(id, {
			tools: tools.map((t) => ({
				name: t.name,
				description: t.description,
				inputSchema: t.inputSchema,
			})),
		});
	}

	if (method === "tools/call") {
		const callParams = params as
			| { name?: string; arguments?: Record<string, unknown> }
			| undefined;
		if (!callParams?.name) {
			return jsonRpcError(id, -32602, "Missing tool name");
		}

		const tool = tools.find((t) => t.name === callParams.name);
		if (!tool) {
			return jsonRpcError(id, -32602, `Unknown tool: ${callParams.name}`);
		}

		try {
			const result = await tool.handler(callParams.arguments);

			if (tool.isWrite) {
				try {
					const auditLog: TAuditLog = {
						id: crypto.randomUUID() as TAuditLogId,
						tenantId: mcpBusinessId as TTenantId,
						userId: "mcp-server" as TUserId,
						action: `mcp:${tool.name}`,
						entityType: "mcp",
						entityId: tool.name,
						oldValue: null,
						newValue: { args: callParams.arguments },
						ipAddress: ip,
						userAgent: request.headers.get("User-Agent") ?? null,
						createdAt: new Date(),
					};
					await runApp(
						Effect.gen(function* () {
							const audit = yield* IAuditRepository;
							yield* audit.save(auditLog);
						}),
					);
				} catch {
					// Audit failure must never block the business response
				}
			}

			return jsonRpcSuccess(id, {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			});
		} catch (error) {
			return jsonRpcError(
				id,
				-32603,
				error instanceof Error ? error.message : "Internal error",
				500,
			);
		}
	}

	return jsonRpcError(id, -32601, `Method not found: ${method}`, 404);
};
