import * as React from "react";
import { useTranslation } from "react-i18next";
import WebhookSubscription from "~/models/WebhookSubscription";
import useToasts from "~/hooks/useToasts";
import WebhookSubscriptionForm from "./WebhookSubscriptionForm";

type Props = {
  onSubmit: () => void;
  webhookSubscription: WebhookSubscription;
};

interface FormData {
  name: string;
  url: string;
  events: string[];
}

function WebhookSubscriptionEdit({ onSubmit, webhookSubscription }: Props) {
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

        await webhookSubscription.save(toSend);

        showToast(
          t("Webhook updated", {
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
    [t, showToast, onSubmit, webhookSubscription]
  );

  return (
    <WebhookSubscriptionForm
      handleSubmit={handleSubmit}
      webhookSubscription={webhookSubscription}
    />
  );
}

export default WebhookSubscriptionEdit;
