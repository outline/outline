import { z } from "zod";

const BaseSchema = z.object({
  body: z.unknown(),
  query: z.unknown(),
});

export default BaseSchema;
