import * as React from "react";
import { useTranslation } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import ConfirmationDialog from "~/components/ConfirmationDialog";

type Props = {
  token: ApiKey;
  onSubmit: () => void;
};

export default function TokenRevokeDialog({ token, onSubmit }: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await token.delete();
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Revoke")}
      savingText={`${t("Revoking")}…`}
      danger
    >
      {t("Are you sure you want to revoke the {{ tokenName }} token?", {
        tokenName: token.name,
      })}
    </ConfirmationDialog>
  );
}
