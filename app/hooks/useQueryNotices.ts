import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { QueryNotices } from "@shared/types";
import useConsumeQueryParam from "./useConsumeQueryParam";

/**
 * Display a toast message based on a notice in the query string. This is usually
 * used when redirecting from an external source to the client, such as OAuth,
 * or emails.
 */
export default function useQueryNotices() {
  const { t } = useTranslation();
  const notice = useConsumeQueryParam("notice") as QueryNotices;

  useEffect(() => {
    let message: string | undefined;

    switch (notice) {
      case QueryNotices.UnsubscribeDocument: {
        message = t("Unsubscribed from document");
        break;
      }
      case QueryNotices.UnsubscribeCollection: {
        message = t("Unsubscribed from collection");
        break;
      }
      case QueryNotices.Subscribed: {
        message = t("Subscription successful");
        break;
      }
      case QueryNotices.Unsubscribed: {
        message = t("Unsubscribed");
        break;
      }
      default:
    }

    if (message) {
      setTimeout(() => toast.success(message), 0);
    }
  }, [t, notice]);
}
