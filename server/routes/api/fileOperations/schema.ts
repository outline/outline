import z from "zod";
import BaseSchema from "../BaseSchema";

export const FileOperationsInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the file operation to be retrieved */
    id: z.string().uuid(),
  }),
});

export type FileOperationsInfoReq = z.infer<typeof FileOperationsInfoSchema>;
