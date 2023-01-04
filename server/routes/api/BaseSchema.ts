import { z } from "zod";

const BaseSchema = z.object({
  body: z.object({}),
  query: z.object({}),
});

export default BaseSchema;
