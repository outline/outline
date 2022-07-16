import * as React from "react";
import { useTranslation } from "react-i18next";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
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
  const { showToast } = useToasts();
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
        showToast(
          t("Webhook created", {
            type: "success",
          })
        );
        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [t, showToast, onSubmit, webhookSubscriptions]
  );

  return <WebhookSubscriptionForm handleSubmit={handleSubmit} />;
}

export default WebhookSubscriptionNew;
