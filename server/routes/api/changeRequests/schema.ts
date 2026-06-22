import { z } from "zod";
import { ChangeRequestStatus } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";
import { zodIdType } from "@server/utils/zod";

const BaseIdSchema = z.object({
  id: z.string().uuid(),
});

export const ChangeRequestsListSchema = BaseSchema.extend({
  body: z.object({
    status: z.nativeEnum(ChangeRequestStatus).optional(),
    collectionId: zodIdType().optional(),
    draftDocumentId: zodIdType().optional(),
  }),
});

export type ChangeRequestsListReq = z.infer<typeof ChangeRequestsListSchema>;

export const ChangeRequestsInfoSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type ChangeRequestsInfoReq = z.infer<typeof ChangeRequestsInfoSchema>;

export const ChangeRequestsSubmitSchema = BaseSchema.extend({
  body: z.object({
    draftDocumentId: zodIdType(),
  }),
});

export type ChangeRequestsSubmitReq = z.infer<typeof ChangeRequestsSubmitSchema>;

export const ChangeRequestsApproveSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type ChangeRequestsApproveReq = z.infer<
  typeof ChangeRequestsApproveSchema
>;

export const ChangeRequestsRejectSchema = BaseSchema.extend({
  body: BaseIdSchema.extend({
    reviewNote: z.string().trim().max(1000).optional(),
  }),
});

export type ChangeRequestsRejectReq = z.infer<typeof ChangeRequestsRejectSchema>;

export const ChangeRequestsWithdrawSchema = BaseSchema.extend({
  body: BaseIdSchema,
});

export type ChangeRequestsWithdrawReq = z.infer<
  typeof ChangeRequestsWithdrawSchema
>;
