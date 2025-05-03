import * as React from "react";
import { useTranslation } from "react-i18next";
import OAuthClient from "~/models/oauth/OAuthClient";
import ConfirmationDialog from "~/components/ConfirmationDialog";

type Props = {
  oauthClient: OAuthClient;
  onSubmit: () => void;
};

export default function OAuthClientDeleteDialog({
  oauthClient,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await oauthClient.delete();
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      {t(
        "Are you sure you want to delete the {{ appName }} application? This cannot be undone.",
        {
          appName: oauthClient.name,
        }
      )}
    </ConfirmationDialog>
  );
}
