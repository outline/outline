import { describe, expect, it } from "vitest";
import { handlePostMcp } from "./mcp";

const MOCK_TOKEN = "test-secret-token";
const MOCK_BUSINESS = "biz-1";

const mockEnv = {
	MCP_SECRET_TOKEN: MOCK_TOKEN,
	MCP_BUSINESS_ID: MOCK_BUSINESS,
};

const postJson = (
	body: unknown,
	overrides?: {
		auth?: string;
		env?: unknown;
		contentLength?: number;
		ip?: string;
	},
): Promise<Response> => {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (overrides?.auth) {
		headers.Authorization = overrides.auth;
	}
	if (overrides?.ip) {
		headers["CF-Connecting-IP"] = overrides.ip;
	}
	const request = new Request("http://localhost/api/mcp", {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
	return handlePostMcp(request, overrides?.env ?? mockEnv);
};

const expectJsonRpcError = async (
	response: Response,
	code: number,
	status: number,
) => {
	expect(response.status).toBe(status);
	const body = (await response.json()) as Record<string, unknown>;
	expect(body.jsonrpc).toBe("2.0");
	const error = body.error as Record<string, unknown>;
	expect(error.code).toBe(code);
};

describe("MCP Protocol — Authentication", () => {
	it("should reject requests without Authorization header", async () => {
		const request = new Request("http://localhost/api/mcp", {
			method: "POST",
			body: JSON.stringify({ jsonrpc: "2.0", method: "initialize" }),
		});
		const res = await handlePostMcp(request, mockEnv);
		await expectJsonRpcError(res, -32001, 401);
	});

	it("should reject requests with invalid token", async () => {
		const res = await postJson(
			{ jsonrpc: "2.0", method: "initialize" },
			{ auth: "Bearer wrong-token" },
		);
		await expectJsonRpcError(res, -32001, 401);
	});

	it("should accept requests with valid token", async () => {
		const res = await postJson(
			{ jsonrpc: "2.0", id: 1, method: "initialize" },
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		expect(res.status).toBe(200);
	});
});

describe("MCP Protocol — initialize", () => {
	it("should return protocol version and capabilities", async () => {
		const res = await postJson(
			{ jsonrpc: "2.0", id: 1, method: "initialize" },
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.jsonrpc).toBe("2.0");
		expect(body.id).toBe(1);
		const result = body.result as Record<string, unknown>;
		expect(result.protocolVersion).toBeDefined();
		expect(
			(result.capabilities as Record<string, unknown>).tools,
		).toBeDefined();
		expect((result.serverInfo as Record<string, unknown>).name).toBe(
			"pet-store-mcp",
		);
	});
});

describe("MCP Protocol — notifications/initialized", () => {
	it("should accept and return empty result", async () => {
		const res = await postJson(
			{
				jsonrpc: "2.0",
				method: "notifications/initialized",
			},
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.jsonrpc).toBe("2.0");
	});
});

describe("MCP Protocol — tools/list", () => {
	it("should return tool definitions", async () => {
		const res = await postJson(
			{ jsonrpc: "2.0", id: 2, method: "tools/list" },
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.id).toBe(2);
		expect(body.result).toBeDefined();
		const result = body.result as { tools: Array<Record<string, unknown>> };
		expect(Array.isArray(result.tools)).toBe(true);
	});

	it("should include known tools", async () => {
		const res = await postJson(
			{ jsonrpc: "2.0", id: 3, method: "tools/list" },
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		const body = (await res.json()) as Record<string, unknown>;
		const result = body.result as { tools: Array<Record<string, unknown>> };
		const toolNames = result.tools.map((t) => t.name);
		expect(toolNames).toContain("get_business_snapshot");
		expect(toolNames).toContain("list_products");
		expect(toolNames).toContain("list_boardings");
		expect(toolNames).toContain("create_order");
		expect(toolNames).toContain("invite_staff");
	});
});

describe("MCP Protocol — tools/call errors", () => {
	it("should reject unknown tool", async () => {
		const res = await postJson(
			{
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: { name: "nonexistent_tool" },
			},
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		await expectJsonRpcError(res, -32602, 400);
	});

	it("should reject missing tool name", async () => {
		const res = await postJson(
			{
				jsonrpc: "2.0",
				id: 5,
				method: "tools/call",
				params: {},
			},
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		await expectJsonRpcError(res, -32602, 400);
	});
});

describe("MCP Protocol — unknown method", () => {
	it("should return MethodNotFound error", async () => {
		const res = await postJson(
			{
				jsonrpc: "2.0",
				id: 6,
				method: "resources/list",
			},
			{ auth: `Bearer ${MOCK_TOKEN}` },
		);
		await expectJsonRpcError(res, -32601, 404);
	});
});

describe("MCP Protocol — parse error", () => {
	it("should return ParseError for invalid JSON", async () => {
		const request = new Request("http://localhost/api/mcp", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${MOCK_TOKEN}`,
			},
			body: "not json",
		});
		const res = await handlePostMcp(request, mockEnv);
		await expectJsonRpcError(res, -32700, 400);
	});
});

describe("MCP Protocol — rate limiting", () => {
	it("should reject excessive requests from same IP", async () => {
		const requests = Array.from({ length: 65 }, (_, i) => ({
			jsonrpc: "2.0",
			id: i,
			method: "tools/list",
		}));

		let lastStatus = 200;
		for (const body of requests) {
			const res = await postJson(body, {
				auth: `Bearer ${MOCK_TOKEN}`,
				ip: "10.0.0.1",
			});
			lastStatus = res.status;
		}

		expect(lastStatus).toBe(429);
	});
});
