import { z } from "zod";
import { AttachmentPreset } from "@shared/types";

export const AttachmentsCreateSchema = z.object({
  /** Attachment name */
  name: z.string(),

  /** Id of the document to which the Attachment belongs */
  documentId: z.string().uuid().optional(),

  /** File size of the Attachment */
  size: z.number(),

  /** Content-Type of the Attachment */
  contentType: z.string().optional().default("application/octet-stream"),

  /** Attachment type */
  preset: z.nativeEnum(AttachmentPreset),
});

export type AttachmentCreateReq = z.infer<typeof AttachmentsCreateSchema>;

export const AttachmentDeleteSchema = z.object({
  /** Id of the attachment to be deleted */
  id: z.string().uuid(),
});

export type AttachmentDeleteReq = z.infer<typeof AttachmentDeleteSchema>;
