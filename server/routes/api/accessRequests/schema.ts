import { z } from "zod";
import { DocumentPermission } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

const BaseIdSchema = z.object({
  id: z.string().uuid(),
});

export const AccessRequestInfoSchema = BaseSchema.extend({
  body: z
    .object({
      id: z.string().uuid().optional(),
      documentSlug: z.string().optional(),
    })
    .refine((data) => data.id || data.documentSlug, {
      message: "Either 'id' or 'documentSlug' must be provided",
      path: ["body"],
    }),
});

export type AccessRequestInfoReq = z.infer<typeof AccessRequestInfoSchema>;

export const AccessRequestsApproveSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    permission: z.nativeEnum(DocumentPermission),
  }),
});

export type AccessRequestsApproveReq = z.infer<
  typeof AccessRequestsApproveSchema
>;

export const AccessRequestsDismissSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type AccessRequestsDismissReq = z.infer<
  typeof AccessRequestsDismissSchema
>;
