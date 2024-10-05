import { z } from "zod";
import { BaseSchema } from "../schema";

export const InstallationInfoSchema = BaseSchema.extend({
  body: z.object({}),
});
