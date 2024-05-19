import z from "zod";
import { BaseSchema } from "../schema";

export const ViewsListSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the document to retrieve the views for */
    documentId: z.string().uuid(),

    /** Whether to include views by suspended users */
    includeSuspended: z.boolean().default(false),
  }),
});

export type ViewsListReq = z.infer<typeof ViewsListSchema>;

export const ViewsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the document to create the view for */
    documentId: z.string().uuid(),
  }),
});

export type ViewsCreateReq = z.infer<typeof ViewsCreateSchema>;
