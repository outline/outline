import { useTranslation } from "react-i18next";
import type OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import ConfirmationDialog from "~/components/ConfirmationDialog";

type Props = {
  oauthAuthentication: OAuthAuthentication;
  onSubmit: () => void;
};

export default function OAuthAuthenticationRevokeDialog({
  oauthAuthentication,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await oauthAuthentication.deleteAll();
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Revoke")}
      savingText={`${t("Revoking")}…`}
      danger
    >
      {t("Are you sure you want to revoke access?")}
    </ConfirmationDialog>
  );
}
