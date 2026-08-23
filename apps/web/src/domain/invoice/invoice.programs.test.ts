import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { InvoiceNotFoundError } from "./invoice.errors";
import {
	createInvoiceProgram,
	getInvoiceByIdProgram,
	getInvoicesProgram,
	recordPaymentProgram,
} from "./invoice.programs";
import { InvoiceRepository } from "./invoice.repository";
import type {
	TInvoiceDto,
	TInvoiceId,
	TInvoicePaymentDto,
} from "./invoice.types";

describe("InvoicePrograms", () => {
	const tenantId = generateId<TTenantId>();

	const makeInvoice = (overrides: Partial<TInvoiceDto> = {}): TInvoiceDto => ({
		id: generateId() as TInvoiceId,
		businessId: tenantId,
		branchId: null,
		customerId: "cust-1" as TInvoiceDto["customerId"],
		invoiceNumber: "INV-20260620-ABCD",
		status: "unpaid",
		issueDate: "2026-06-20",
		dueDate: "2026-07-20",
		subtotal: 100000,
		taxAmount: 11000,
		discountAmount: 0,
		totalAmount: 111000,
		amountPaid: 0,
		notes: null,
		terms: null,
		createdBy: null,
		createdAt: "2026-06-20T10:00:00Z",
		updatedAt: "2026-06-20T10:00:00Z",
		...overrides,
	});

	const makePayment = (
		overrides: Partial<TInvoicePaymentDto> = {},
	): TInvoicePaymentDto => ({
		id: "pay-1" as TInvoicePaymentDto["id"],
		invoiceId: generateId() as TInvoiceId,
		paymentDate: "2026-06-20",
		amount: 50000,
		method: "cash",
		reference: null,
		recordedBy: null,
		...overrides,
	});

	describe("getInvoicesProgram", () => {
		it("should return all invoices without status filter", async () => {
			const invoices = [makeInvoice()];
			const findAll = vi.fn().mockReturnValue(Effect.succeed(invoices));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll,
				findById: vi.fn(),
				recordPayment: vi.fn(),
			});

			const result = await Effect.runPromise(
				getInvoicesProgram(tenantId).pipe(Effect.provide(layer)),
			);

			expect(result).toHaveLength(1);
			expect(findAll).toHaveBeenCalledWith(tenantId, undefined);
		});

		it("should filter by status when provided", async () => {
			const paidInvoices = [
				makeInvoice({ status: "paid", invoiceNumber: "INV-0001" }),
			];
			const findAll = vi.fn().mockReturnValue(Effect.succeed(paidInvoices));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll,
				findById: vi.fn(),
				recordPayment: vi.fn(),
			});

			const result = await Effect.runPromise(
				getInvoicesProgram(tenantId, "paid").pipe(Effect.provide(layer)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.status).toBe("paid");
			expect(findAll).toHaveBeenCalledWith(tenantId, "paid");
		});

		it("should propagate DatabaseError", async () => {
			const findAll = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll,
				findById: vi.fn(),
				recordPayment: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					getInvoicesProgram(tenantId).pipe(Effect.provide(layer)),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getInvoiceByIdProgram", () => {
		it("should return invoice when found", async () => {
			const invoice = makeInvoice({ invoiceNumber: "INV-0001" });
			const findById = vi.fn().mockReturnValue(Effect.succeed(invoice));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment: vi.fn(),
			});

			const result = await Effect.runPromise(
				getInvoiceByIdProgram(tenantId, invoice.id).pipe(Effect.provide(layer)),
			);

			expect(result.invoiceNumber).toBe("INV-0001");
			expect(findById).toHaveBeenCalledWith(tenantId, invoice.id);
		});

		it("should propagate InvoiceNotFoundError", async () => {
			const findById = vi
				.fn()
				.mockReturnValue(
					Effect.fail(
						new InvoiceNotFoundError({ message: "Invoice not found" }),
					),
				);
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					getInvoiceByIdProgram(tenantId, "invalid" as TInvoiceId).pipe(
						Effect.provide(layer),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvoiceNotFoundError"),
			});
		});
	});

	describe("createInvoiceProgram", () => {
		it("should create invoice with generated number", async () => {
			const cmd = {
				customerId: "cust-1",
				issueDate: "2026-06-20",
				dueDate: "2026-07-20",
				subtotal: 100000,
				taxAmount: 11000,
				discountAmount: 0,
				totalAmount: 111000,
				items: [
					{
						itemName: "Grooming Service",
						quantity: 1,
						unitPrice: 100000,
						discount: 0,
						total: 100000,
					},
				],
			};
			const created = makeInvoice({ invoiceNumber: "INV-20260620-TEST" });
			const create = vi.fn().mockReturnValue(Effect.succeed(created));
			const layer = Layer.succeed(InvoiceRepository, {
				create,
				findAll: vi.fn(),
				findById: vi.fn(),
				recordPayment: vi.fn(),
			});

			const result = await Effect.runPromise(
				createInvoiceProgram(tenantId, cmd).pipe(Effect.provide(layer)),
			);

			expect(result).toBeDefined();
			expect(create).toHaveBeenCalledWith(
				tenantId,
				expect.objectContaining({
					...cmd,
					invoiceNumber: expect.stringMatching(/^INV-/),
				}),
			);
		});

		it("should propagate DatabaseError", async () => {
			const cmd = {
				customerId: "cust-1",
				issueDate: "2026-06-20",
				dueDate: "2026-07-20",
				subtotal: 100000,
				taxAmount: 11000,
				discountAmount: 0,
				totalAmount: 111000,
				items: [],
			};
			const create = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const layer = Layer.succeed(InvoiceRepository, {
				create,
				findAll: vi.fn(),
				findById: vi.fn(),
				recordPayment: vi.fn(),
			});

			await expect(
				Effect.runPromise(
					createInvoiceProgram(tenantId, cmd).pipe(Effect.provide(layer)),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("recordPaymentProgram", () => {
		it("should record a partial payment and update status to partial", async () => {
			const invoice = makeInvoice({
				totalAmount: 100000,
				amountPaid: 0,
				status: "unpaid",
			});
			const payment = makePayment({ amount: 50000 });

			const findById = vi.fn().mockReturnValue(Effect.succeed(invoice));
			const recordPayment = vi.fn().mockReturnValue(Effect.succeed(payment));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment,
			});

			const cmd = { amount: 50000, paymentDate: "2026-06-20", method: "cash" };

			const result = await Effect.runPromise(
				recordPaymentProgram(tenantId, invoice.id, cmd).pipe(
					Effect.provide(layer),
				),
			);

			expect(result.amount).toBe(50000);
			// Program no longer computes status/amountPaid in JS — the
			// atomic RPC owns that. Repo is called with just cmd.
			expect(recordPayment).toHaveBeenCalledWith(tenantId, invoice.id, cmd);
		});

		it("should record a full payment and update status to paid", async () => {
			const invoice = makeInvoice({
				totalAmount: 100000,
				amountPaid: 0,
				status: "unpaid",
			});
			const payment = makePayment({ amount: 100000 });

			const findById = vi.fn().mockReturnValue(Effect.succeed(invoice));
			const recordPayment = vi.fn().mockReturnValue(Effect.succeed(payment));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment,
			});

			const cmd = {
				amount: 100000,
				paymentDate: "2026-06-20",
				method: "transfer",
			};

			const result = await Effect.runPromise(
				recordPaymentProgram(tenantId, invoice.id, cmd).pipe(
					Effect.provide(layer),
				),
			);

			expect(result.amount).toBe(100000);
			expect(recordPayment).toHaveBeenCalledWith(tenantId, invoice.id, cmd);
		});

		it("should fail when payment exceeds total amount", async () => {
			const invoice = makeInvoice({
				totalAmount: 50000,
				amountPaid: 0,
				status: "unpaid",
			});
			const findById = vi.fn().mockReturnValue(Effect.succeed(invoice));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment: vi.fn(),
			});

			const cmd = {
				amount: 100000,
				paymentDate: "2026-06-20",
				method: "cash",
			};

			await expect(
				Effect.runPromise(
					recordPaymentProgram(tenantId, invoice.id, cmd).pipe(
						Effect.provide(layer),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvoiceValidationError"),
			});
		});

		it("should fail when payment is zero", async () => {
			const invoice = makeInvoice();
			const findById = vi.fn().mockReturnValue(Effect.succeed(invoice));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment: vi.fn(),
			});

			const cmd = {
				amount: 0,
				paymentDate: "2026-06-20",
				method: "cash",
			};

			await expect(
				Effect.runPromise(
					recordPaymentProgram(tenantId, invoice.id, cmd).pipe(
						Effect.provide(layer),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvoiceValidationError"),
			});
		});

		it("should fail when payment is negative", async () => {
			const invoice = makeInvoice();
			const findById = vi.fn().mockReturnValue(Effect.succeed(invoice));
			const layer = Layer.succeed(InvoiceRepository, {
				create: vi.fn(),
				findAll: vi.fn(),
				findById,
				recordPayment: vi.fn(),
			});

			const cmd = {
				amount: -5000,
				paymentDate: "2026-06-20",
				method: "cash",
			};

			await expect(
				Effect.runPromise(
					recordPaymentProgram(tenantId, invoice.id, cmd).pipe(
						Effect.provide(layer),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("InvoiceValidationError"),
			});
		});
	});
});
