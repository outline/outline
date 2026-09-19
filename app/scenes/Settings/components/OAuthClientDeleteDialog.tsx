import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import type OAuthClient from "~/models/oauth/OAuthClient";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { settingsPath } from "~/utils/routeHelpers";

type Props = {
  oauthClient: OAuthClient;
  onSubmit: () => void;
};

export default function OAuthClientDeleteDialog({
  oauthClient,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();

  const handleSubmit = async () => {
    // Navigate back to the list if we're viewing the app being deleted.
    if (location.pathname === settingsPath("applications", oauthClient.id)) {
      history.push(settingsPath("applications"));
    }

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
