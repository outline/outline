import { Effect } from "effect";
import type { TTenantId } from "@/shared/types/common.types";
import { InvoiceModule } from "./invoice.module";
import type {
	ICreateInvoiceCommand,
	IRecordPaymentCommand,
} from "./invoice.repository";
import { InvoiceRepository } from "./invoice.repository";
import type { TInvoiceId } from "./invoice.types";

export const getInvoicesProgram = (tenantId: TTenantId, status?: string) =>
	Effect.gen(function* () {
		const repo = yield* InvoiceRepository;
		return yield* repo.findAll(tenantId, status);
	});

export const getInvoiceByIdProgram = (
	tenantId: TTenantId,
	invoiceId: TInvoiceId,
) =>
	Effect.gen(function* () {
		const repo = yield* InvoiceRepository;
		return yield* repo.findById(tenantId, invoiceId);
	});

export const createInvoiceProgram = (
	tenantId: TTenantId,
	cmd: Omit<ICreateInvoiceCommand, "invoiceNumber">,
) =>
	Effect.gen(function* () {
		const repo = yield* InvoiceRepository;
		const invoiceNumber = InvoiceModule.generateInvoiceNumber();
		return yield* repo.create(tenantId, {
			...cmd,
			invoiceNumber,
		});
	});

export const recordPaymentProgram = (
	tenantId: TTenantId,
	invoiceId: TInvoiceId,
	cmd: IRecordPaymentCommand,
) =>
	Effect.gen(function* () {
		const repo = yield* InvoiceRepository;
		// Validate the requested amount against the current invoice
		// before calling the atomic RPC. The RPC will additionally
		// re-check inside the FOR UPDATE lock to handle the race
		// where another payment landed between this validation and
		// the RPC call.
		const invoice = yield* repo.findById(tenantId, invoiceId);
		yield* InvoiceModule.validatePaymentAmount(
			invoice.totalAmount,
			invoice.amountPaid,
			cmd.amount,
		);
		return yield* repo.recordPayment(tenantId, invoiceId, cmd);
	});

export const voidInvoiceProgram = (
	tenantId: TTenantId,
	invoiceId: TInvoiceId,
) =>
	Effect.gen(function* () {
		const repo = yield* InvoiceRepository;
		if (!repo.voidInvoice) {
			return yield* Effect.die("Invoice void operation is unavailable");
		}
		yield* repo.voidInvoice(tenantId, invoiceId);
	});
