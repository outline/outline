import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const EventsListSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the user who performed the action */
    actorId: z.string().uuid().optional(),

    /** Id of the document to filter the events for */
    documentId: z.string().uuid().optional(),

    /** Id of the collection to filter the events for */
    collectionId: z.string().uuid().optional(),

    /** Whether to include audit events */
    auditLog: z.boolean().default(false),

    /** Name of the event to retrieve */
    name: z.string().optional(),

    /** The attribute to sort the events by */
    sort: z
      .string()
      .refine((val) => ["name", "createdAt"].includes(val))
      .default("createdAt"),

    /** The direction to sort the events */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),
  }),
});

export type EventsListReq = z.infer<typeof EventsListSchema>;
