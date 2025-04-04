import { IssueSource } from "@shared/schema";
import { z } from "zod";
import { BaseSchema } from "../schema";

export const IssuesCreateSchema = BaseSchema.extend({
  body: z.object({
    title: z.string().nonempty(),
    source: IssueSource,
  }),
});

export type IssuesCreateReq = z.infer<typeof IssuesCreateSchema>;
