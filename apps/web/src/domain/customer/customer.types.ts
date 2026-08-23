export type TCustomerId = string & { readonly _brand: "CustomerId" };

export interface ICustomer {
	id: TCustomerId;
	businessId: string;
	userId: string | null;
	fullName: string;
	phone: string;
	email: string | null;
	address: string | null;
	notes: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface ICreateCustomerCommand {
	fullName: string;
	phone: string;
	email?: string | null;
	address?: string | null;
	notes?: string | null;
}

export interface IUpdateCustomerCommand
	extends Partial<ICreateCustomerCommand> {
	id: TCustomerId;
	isActive?: boolean;
}
