import isNil from "lodash/isNil";
import { z } from "zod";
import { isUrl } from "@shared/utils/urls";
import { ValidateURL } from "@server/validation";
import BaseSchema from "../BaseSchema";

export const UrlsUnfurlSchema = BaseSchema.extend({
  body: z
    .object({
      url: z
        .string()
        .url()
        .refine(
          (val) => {
            try {
              const url = new URL(val);
              if (url.protocol === "mention:") {
                return ValidateURL.isValidMentionUrl(val);
              }
              return isUrl(val);
            } catch (err) {
              return false;
            }
          },
          { message: ValidateURL.message }
        ),
      documentId: z.string().uuid().optional(),
    })
    .refine(
      (val) =>
        !(ValidateURL.isValidMentionUrl(val.url) && isNil(val.documentId)),
      { message: "documentId required" }
    ),
});

export type UrlsUnfurlReq = z.infer<typeof UrlsUnfurlSchema>;
