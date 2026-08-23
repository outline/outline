import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	ICreateTemplateCommand,
	IDocumentTemplate,
	IUpdateTemplateCommand,
} from "./document-template.types";

export class IDocumentTemplateRepository extends Context.Tag(
	"IDocumentTemplateRepository",
)<
	IDocumentTemplateRepository,
	{
		readonly findByType: (
			businessId: string,
			type: string,
		) => Effect.Effect<IDocumentTemplate | null, DatabaseError>;
		readonly save: (
			businessId: string,
			cmd: ICreateTemplateCommand,
		) => Effect.Effect<IDocumentTemplate, DatabaseError>;
		readonly update: (
			cmd: IUpdateTemplateCommand,
		) => Effect.Effect<IDocumentTemplate, DatabaseError>;
	}
>() {}
