import { z } from "zod";
import { Document } from "@server/models";

const DocumentSchema = z
  .object({
    // validations
    id: z.string().uuid().nullish(),
    userId: z.string().uuid().nullish(),
    collectionId: z.string().uuid().nullish(),
    backlinkDocumentId: z.string().uuid().nullish(),
    parentDocumentId: z.string().uuid().nullish(),
    revisionId: z.string().uuid().nullish(),
    templateId: z.string().uuid().nullish(),
    template: z.boolean().nullish(),
    fullWidth: z.boolean().nullish(),
    append: z.boolean().nullish(),
    publish: z.boolean().nullish(),
    permanent: z.boolean().nullish(),
    lastRevision: z.number().nullish(),

    // defaults
    sort: z
      .string()
      .refine((val) =>
        [...Object.keys(Document.rawAttributes), "index"].includes(val)
      )
      .default("updatedAt"),
    title: z.string().default(""),
    text: z.string().default(""),

    // transforms
    direction: z
      .string()
      .nullish()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    // refinements
    dateFilter: z
      .string()
      .refine((val) => ["day", "week", "month", "year"].includes(val))
      .nullish(),
  })
  .passthrough();

export default DocumentSchema;
