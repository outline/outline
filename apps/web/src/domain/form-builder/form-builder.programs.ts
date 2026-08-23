import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { IFormBuilderRepository } from "./form-builder.repository";
import type { TLinkDoctype, TLinkOption } from "./form-builder.types";

export const getLinkDoctypeOptionsProgram = (
	tenantId: TTenantId,
	doctype: TLinkDoctype,
	search: string,
): Effect.Effect<
	readonly TLinkOption[],
	DatabaseError,
	IFormBuilderRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IFormBuilderRepository;
		return yield* repo.getLinkDoctypeOptions(tenantId, doctype, search);
	});
