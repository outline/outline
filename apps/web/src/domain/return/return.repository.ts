import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { TReturnId, TReturnWithItems } from "./return.types";

export class IReturnRepository extends Context.Tag("IReturnRepository")<
	IReturnRepository,
	{
		readonly findAll: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TReturnWithItems[], DatabaseError>;

		readonly processReturn: (
			returnWithItems: TReturnWithItems,
		) => Effect.Effect<TReturnId, DatabaseError>;
	}
>() {}
