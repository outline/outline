import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { QueryNotices } from "@shared/types";
import useQuery from "./useQuery";

/**
 * Display a toast message based on a notice in the query string. This is usually
 * used when redirecting from an external source to the client, such as OAuth,
 * or emails.
 */
export default function useQueryNotices() {
  const query = useQuery();
  const history = useHistory();
  const { t } = useTranslation();
  const notice = query.get("notice") as QueryNotices;

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
      toast.success(message);

      // Remove the notice param from the URL to prevent duplicate toasts
      const params = new URLSearchParams(window.location.search);
      params.delete("notice");
      const search = params.toString();
      history.replace({
        pathname: window.location.pathname,
        search: search ? `?${search}` : "",
      });
    }
  }, [t, notice, history]);
}
