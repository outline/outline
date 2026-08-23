import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { InvoiceNotFoundError } from "./invoice.errors";
import type {
	TInvoiceDto,
	TInvoiceId,
	TInvoicePaymentDto,
} from "./invoice.types";

export interface ICreateInvoiceCommand {
	customerId: string;
	invoiceNumber: string;
	issueDate: string;
	dueDate: string;
	subtotal: number;
	taxAmount: number;
	discountAmount: number;
	totalAmount: number;
	notes?: string;
	terms?: string;
	items: {
		itemName: string;
		quantity: number;
		unitPrice: number;
		discount: number;
		total: number;
	}[];
}

export interface IRecordPaymentCommand {
	amount: number;
	paymentDate: string;
	method: string;
	reference?: string;
}

export interface IInvoiceRepository {
	create(
		tenantId: TTenantId,
		data: ICreateInvoiceCommand,
	): Effect.Effect<TInvoiceDto, DatabaseError>;

	findAll(
		tenantId: TTenantId,
		status?: string,
	): Effect.Effect<TInvoiceDto[], DatabaseError>;

	findById(
		tenantId: TTenantId,
		invoiceId: TInvoiceId,
	): Effect.Effect<TInvoiceDto, DatabaseError | InvoiceNotFoundError>;

	recordPayment(
		tenantId: TTenantId,
		invoiceId: TInvoiceId,
		data: IRecordPaymentCommand,
	): Effect.Effect<TInvoicePaymentDto, DatabaseError | InvoiceNotFoundError>;
}

export const InvoiceRepository = Context.GenericTag<IInvoiceRepository>(
	"@domain/invoice/repository",
);
