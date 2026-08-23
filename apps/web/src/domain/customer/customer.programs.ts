import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { CustomerModule } from "./customer.module";
import { ICustomerRepository } from "./customer.repository";
import type {
	ICreateCustomerCommand,
	ICustomer,
	IUpdateCustomerCommand,
	TCustomerId,
} from "./customer.types";

export const getCustomersProgram = (
	businessId: TTenantId,
	search?: string,
): Effect.Effect<readonly ICustomer[], DatabaseError, ICustomerRepository> =>
	Effect.gen(function* () {
		const repo = yield* ICustomerRepository;
		const customers = yield* repo.findAll(businessId, search);
		return customers.map((c) => CustomerModule.reconstitute(c));
	});

export const getCustomerByIdProgram = (
	businessId: TTenantId,
	id: string,
): Effect.Effect<ICustomer | null, DatabaseError, ICustomerRepository> =>
	Effect.gen(function* () {
		const repo = yield* ICustomerRepository;
		const customer = yield* repo.findById(businessId, id as TCustomerId);
		return customer ? CustomerModule.reconstitute(customer) : null;
	});

export const createCustomerProgram = (
	businessId: TTenantId,
	command: ICreateCustomerCommand,
): Effect.Effect<ICustomer, DatabaseError, ICustomerRepository> =>
	Effect.gen(function* () {
		const repo = yield* ICustomerRepository;
		return yield* repo.create(businessId, command);
	});

export const getOrCreateCustomerProgram = (
	businessId: TTenantId,
	command: ICreateCustomerCommand,
): Effect.Effect<ICustomer, DatabaseError, ICustomerRepository> =>
	Effect.gen(function* () {
		const repo = yield* ICustomerRepository;
		const existing = yield* repo.findByPhone(businessId, command.phone);
		if (existing) {
			return CustomerModule.reconstitute(existing);
		}
		return yield* repo.create(businessId, command);
	});

export const updateCustomerProgram = (
	businessId: TTenantId,
	command: IUpdateCustomerCommand,
): Effect.Effect<ICustomer, DatabaseError, ICustomerRepository> =>
	Effect.gen(function* () {
		const repo = yield* ICustomerRepository;
		return yield* repo.update(businessId, command);
	});

export const deleteCustomerProgram = (
	businessId: TTenantId,
	id: string,
): Effect.Effect<void, DatabaseError, ICustomerRepository> =>
	Effect.gen(function* () {
		const repo = yield* ICustomerRepository;
		return yield* repo.delete(businessId, id as TCustomerId);
	});
