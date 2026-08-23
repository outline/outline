import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { IDocumentTemplateRepository } from "./document-template.repository";
import type {
	ICreateTemplateCommand,
	IDocumentTemplate,
	IUpdateTemplateCommand,
} from "./document-template.types";

export const getTemplateByTypeProgram = (
	businessId: string,
	type: string,
): Effect.Effect<
	IDocumentTemplate | null,
	DatabaseError,
	IDocumentTemplateRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IDocumentTemplateRepository;
		return yield* repo.findByType(businessId, type);
	});

export const upsertTemplateProgram = (
	businessId: string,
	command: ICreateTemplateCommand | IUpdateTemplateCommand,
): Effect.Effect<
	IDocumentTemplate,
	DatabaseError,
	IDocumentTemplateRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IDocumentTemplateRepository;
		if ("id" in command) {
			return yield* repo.update({ ...command, businessId });
		}
		return yield* repo.save(businessId, command);
	});
