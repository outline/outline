import z from "zod";
import BaseSchema from "../BaseSchema";

export const ViewsListSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the document to retrieve the views for */
    documentId: z.string().uuid(),

    /** Whether to include views by suspended users */
    includeSuspended: z.boolean().default(false),
  }),
});

export type ViewsListReq = z.infer<typeof ViewsListSchema>;
