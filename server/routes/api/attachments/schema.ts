import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { AttachmentPreset } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const AttachmentsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Attachment name */
    name: z.string(),

    /** Id of the document to which the Attachment belongs */
    documentId: z.string().uuid().optional(),

    /** File size of the Attachment */
    size: z.number(),

    /** Content-Type of the Attachment */
    contentType: z.string().optional().default("application/octet-stream"),

    /** Attachment type */
    preset: z
      .nativeEnum(AttachmentPreset)
      .default(AttachmentPreset.DocumentAttachment),
  }),
});

export type AttachmentCreateReq = z.infer<typeof AttachmentsCreateSchema>;

export const AttachmentsCreateFromUrlSchema = BaseSchema.extend({
  body: z.object({
    /** Attachment url */
    url: z.string(),

    /** Id of the document to which the Attachment belongs */
    documentId: z.string().uuid().optional(),

    /** Attachment type */
    preset: z
      .nativeEnum(AttachmentPreset)
      .default(AttachmentPreset.DocumentAttachment),
  }),
});

export type AttachmentCreateFromUrlReq = z.infer<
  typeof AttachmentsCreateFromUrlSchema
>;

export const AttachmentDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the attachment to be deleted */
    id: z.string().uuid(),
  }),
});

export type AttachmentDeleteReq = z.infer<typeof AttachmentDeleteSchema>;

export const AttachmentsRedirectSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the attachment to be deleted */
    id: z.string().uuid().optional(),
  }),
  query: z.object({
    /** Id of the attachment to be deleted */
    id: z.string().uuid().optional(),
  }),
}).refine((req) => !(isEmpty(req.body.id) && isEmpty(req.query.id)), {
  message: "id is required",
});

export type AttachmentsRedirectReq = z.infer<typeof AttachmentsRedirectSchema>;
