import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { TLinkDoctype, TLinkOption } from "./form-builder.types";

export class IFormBuilderRepository extends Context.Tag(
	"IFormBuilderRepository",
)<
	IFormBuilderRepository,
	{
		readonly getLinkDoctypeOptions: (
			tenantId: TTenantId,
			doctype: TLinkDoctype,
			search: string,
		) => Effect.Effect<readonly TLinkOption[], DatabaseError>;
	}
>() {}
