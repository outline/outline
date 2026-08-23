import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	ICreateCustomerCommand,
	ICustomer,
	IUpdateCustomerCommand,
	TCustomerId,
} from "./customer.types";

export class ICustomerRepository extends Context.Tag("ICustomerRepository")<
	ICustomerRepository,
	{
		readonly findAll: (
			businessId: TTenantId,
			search?: string,
		) => Effect.Effect<readonly ICustomer[], DatabaseError>;
		readonly findById: (
			businessId: TTenantId,
			id: TCustomerId,
		) => Effect.Effect<ICustomer | null, DatabaseError>;
		readonly findByPhone: (
			businessId: TTenantId,
			phone: string,
		) => Effect.Effect<ICustomer | null, DatabaseError>;
		readonly create: (
			businessId: TTenantId,
			cmd: ICreateCustomerCommand,
		) => Effect.Effect<ICustomer, DatabaseError>;
		readonly update: (
			businessId: TTenantId,
			cmd: IUpdateCustomerCommand,
		) => Effect.Effect<ICustomer, DatabaseError>;
		readonly delete: (
			businessId: TTenantId,
			id: TCustomerId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
