import * as React from "react";
import { useTranslation } from "react-i18next";
import WebhookSubscription from "~/models/WebhookSubscription";
import ConfirmationDialog from "~/components/ConfirmationDialog";

type Props = {
  webhook: WebhookSubscription;
  onSubmit: () => void;
};

export default function WebhookSubscriptionRevokeDialog({
  webhook,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await webhook.delete();
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      {t("Are you sure you want to delete the {{ name }} webhook?", {
        name: webhook.name,
      })}
    </ConfirmationDialog>
  );
}
