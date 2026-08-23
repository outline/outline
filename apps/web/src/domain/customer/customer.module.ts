import { Effect } from "effect";
import { generateId } from "@/shared/utils";
import type {
	ICreateCustomerCommand,
	ICustomer,
	IUpdateCustomerCommand,
	TCustomerId,
} from "./customer.types";

export const CustomerModule = {
	create: (businessId: string, cmd: ICreateCustomerCommand): ICustomer => ({
		id: generateId() as TCustomerId,
		businessId,
		userId: null,
		fullName: cmd.fullName,
		phone: cmd.phone,
		email: cmd.email ?? null,
		address: cmd.address ?? null,
		notes: cmd.notes ?? null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}),

	update: (
		customer: ICustomer,
		cmd: IUpdateCustomerCommand,
	): Effect.Effect<ICustomer, never> =>
		Effect.succeed({
			...customer,
			fullName: cmd.fullName ?? customer.fullName,
			phone: cmd.phone ?? customer.phone,
			email: cmd.email !== undefined ? (cmd.email ?? null) : customer.email,
			address:
				cmd.address !== undefined ? (cmd.address ?? null) : customer.address,
			notes: cmd.notes !== undefined ? (cmd.notes ?? null) : customer.notes,
			isActive: cmd.isActive ?? customer.isActive,
			updatedAt: new Date(),
		}),

	reconstitute: (raw: ICustomer): ICustomer => ({ ...raw }),
} as const;
