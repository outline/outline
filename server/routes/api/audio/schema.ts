import { z } from "zod";
import { BaseSchema } from "../schema";

export const AudioTranscribeSchema = BaseSchema.extend({
    body: z.object({
        // The attachment ID of the audio file to transcribe
        attachmentId: z.string().uuid(),
        // Optional language hint for transcription
        language: z.string().optional(),
    }),
});

export type AudioTranscribeReq = z.infer<typeof AudioTranscribeSchema>;
