import formidable from "formidable";
import { z } from "zod";

const BaseSchema = z.object({
  body: z.unknown(),
  query: z.unknown(),
  file: z.custom<formidable.File>().optional(),
});

export default BaseSchema;
