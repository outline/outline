import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import useStores from "~/hooks/useStores";
import WebhookSubscriptionForm from "./WebhookSubscriptionForm";

type Props = {
  onSubmit: () => void;
};

interface FormData {
  name: string;
  url: string;
  events: string[];
}

function WebhookSubscriptionNew({ onSubmit }: Props) {
  const { webhookSubscriptions } = useStores();
  const { t } = useTranslation();

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const events = Array.isArray(data.events) ? data.events : [data.events];

        const toSend = {
          ...data,
          events,
        };

        await webhookSubscriptions.create(toSend);
        toast.success(t("Webhook created"));
        onSubmit();
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [t, onSubmit, webhookSubscriptions]
  );

  return <WebhookSubscriptionForm handleSubmit={handleSubmit} />;
}

export default WebhookSubscriptionNew;
