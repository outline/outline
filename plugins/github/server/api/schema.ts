import isEmpty from "lodash/isEmpty";
import isUndefined from "lodash/isUndefined";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export enum SetupAction {
  install = "install",
  request = "request",
}

export const GitHubCallbackSchema = BaseSchema.extend({
  query: z
    .object({
      code: z.string().nullish(),
      state: z.string().uuid().nullish(),
      error: z.string().nullish(),
      installation_id: z.coerce.number().optional(),
      setup_action: z.nativeEnum(SetupAction),
    })
    .refine((req) => !(isEmpty(req.code) && isEmpty(req.error)), {
      message: "one of code or error is required",
    })
    .refine(
      (req) =>
        !(
          req.setup_action === SetupAction.install &&
          isUndefined(req.installation_id)
        ),
      { message: "installation_id is required for installation" }
    ),
});

export type GitHubCallbackReq = z.infer<typeof GitHubCallbackSchema>;
