import isNil from "lodash/isNil";
import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { isUrl } from "@shared/utils/urls";
import { ValidateURL } from "@server/validation";
import { BaseSchema } from "../schema";

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
      documentId: z
        .string()
        .optional()
        .refine(
          (val) =>
            val ? isUUID(val) || UrlHelper.SLUG_URL_REGEX.test(val) : true,
          {
            message: "must be uuid or url slug",
          }
        ),
    })
    .refine(
      (val) =>
        !(ValidateURL.isValidMentionUrl(val.url) && isNil(val.documentId)),
      { message: "documentId required" }
    ),
});

export type UrlsUnfurlReq = z.infer<typeof UrlsUnfurlSchema>;

export const UrlsCheckCnameSchema = BaseSchema.extend({
  body: z.object({
    hostname: z.string(),
  }),
});

export type UrlsCheckCnameReq = z.infer<typeof UrlsCheckCnameSchema>;
