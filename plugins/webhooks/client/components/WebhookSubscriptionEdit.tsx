import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import WebhookSubscription from "~/models/WebhookSubscription";
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

        toast.success(t("Webhook updated"));
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [t, onSubmit, webhookSubscription]
  );

  return (
    <WebhookSubscriptionForm
      handleSubmit={handleSubmit}
      webhookSubscription={webhookSubscription}
    />
  );
}

export default WebhookSubscriptionEdit;
