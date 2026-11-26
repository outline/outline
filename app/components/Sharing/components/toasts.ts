import type { TFunction } from "i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Share from "~/models/Share";
import { daysToExpiry } from "~/utils/date";

/**
 * Shows a toast that confirms a public link was copied, with the days until
 * the link expires if it has an expiry.
 *
 * @param share the share that the link belongs to.
 * @param t the translation function.
 */
export function showPublicLinkCopiedToast(
  share: Share | null | undefined,
  t: TFunction
) {
  toast.success(t("Public link copied to clipboard"), {
    description: share?.expiresAt
      ? daysToExpiry(share.expiresAt, t)
      : undefined,
  });
}

/**
 * Shows a toast with the message of an error.
 *
 * @param err the caught error.
 */
export function showErrorToast(err: unknown) {
  toast.error(errToString(err));
}
