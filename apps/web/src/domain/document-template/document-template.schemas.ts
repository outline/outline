import { Schema } from "effect";

export const BoardingTemplateContentSchema = Schema.Struct({
	title: Schema.String,
	header: Schema.String,
	p1: Schema.String,
	p2: Schema.String,
	p3: Schema.String,
	p4: Schema.String,
	footer: Schema.String,
	termsAndConditions: Schema.Array(Schema.String),
	fontSize: Schema.optional(Schema.Number),
	lineSpacing: Schema.optional(Schema.Number),
	paragraphSpacing: Schema.optional(Schema.Number),
	marginTop: Schema.optional(Schema.Number),
	showLogo: Schema.optional(Schema.Boolean),
	showSignature: Schema.optional(Schema.Boolean),
});

export type BoardingTemplateContentCommand = Schema.Schema.Type<
	typeof BoardingTemplateContentSchema
>;

export const CreateDocumentTemplateSchema = Schema.Struct({
	type: Schema.String.pipe(Schema.minLength(1)),
	name: Schema.String.pipe(Schema.minLength(1)),
	content: BoardingTemplateContentSchema,
});

export type CreateDocumentTemplateCommand = Schema.Schema.Type<
	typeof CreateDocumentTemplateSchema
>;

export const UpdateDocumentTemplateSchema = Schema.Struct({
	id: Schema.String,
	content: BoardingTemplateContentSchema,
});

export type UpdateDocumentTemplateCommand = Schema.Schema.Type<
	typeof UpdateDocumentTemplateSchema
>;
