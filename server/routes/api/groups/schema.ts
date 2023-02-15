import { z } from "zod";
import { Group } from "@server/models";

const BaseIdSchema = z.object({
  /** Group Id */
  id: z.string().uuid(),
});

export const GroupsListSchema = z.object({
  body: z.object({
    /** Groups sorting direction */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    /** Groups sorting column */
    sort: z
      .string()
      .refine((val) => Object.keys(Group.getAttributes()).includes(val), {
        message: "Invalid sort parameter",
      })
      .default("updatedAt"),
  }),
});

export type GroupsListReq = z.infer<typeof GroupsListSchema>;

export const GroupsInfoSchema = z.object({
  body: BaseIdSchema,
});

export type GroupsInfoReq = z.infer<typeof GroupsInfoSchema>;
