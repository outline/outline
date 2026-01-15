import { z } from "zod";
import { DocumentPermission } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";
import { zodIdType } from "@server/utils/zod";

const BaseIdSchema = z.object({
  id: z.string().uuid(),
});

export const AccessRequestsCreateSchema = BaseSchema.extend({
  body: z.object({
    documentId: zodIdType(),
  }),
});

export type AccessRequestsCreateReq = z.infer<
  typeof AccessRequestsCreateSchema
>;

export const AccessRequestInfoSchema = BaseSchema.extend({
  body: z
    .object({
      id: z.string().uuid().optional(),
      documentId: zodIdType().optional(),
    })
    .refine((data) => data.id || data.documentId, {
      message: "Either 'id' or 'documentId' must be provided",
      path: ["body"],
    }),
});

export type AccessRequestInfoReq = z.infer<typeof AccessRequestInfoSchema>;

export const AccessRequestsApproveSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    permission: z
      .nativeEnum(DocumentPermission)
      .default(DocumentPermission.Read),
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
