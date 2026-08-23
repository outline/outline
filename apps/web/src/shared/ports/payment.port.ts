import { Context, type Effect } from "effect";

export type TPaymentError = {
	readonly _tag: "PaymentError";
	readonly message: string;
	readonly cause: unknown;
};

export type TPaymentParams = {
	readonly orderId: string;
	readonly amount: number;
	readonly customer: {
		readonly name: string;
		readonly email: string;
		readonly phone?: string;
	};
	readonly items?: readonly {
		readonly id: string;
		readonly name: string;
		readonly price: number;
		readonly quantity: number;
	}[];
};

export type TPaymentResult = {
	readonly token: string;
	readonly redirectUrl: string;
};

/**
 * Port: IPaymentProvider
 * Standardized interface for payment processing.
 */
export interface IPaymentProvider {
	readonly createTransaction: (
		params: TPaymentParams,
	) => Effect.Effect<TPaymentResult, TPaymentError>;
	readonly getStatus: (orderId: string) => Effect.Effect<string, TPaymentError>;
}

export const IPaymentProvider =
	Context.GenericTag<IPaymentProvider>("IPaymentProvider");
