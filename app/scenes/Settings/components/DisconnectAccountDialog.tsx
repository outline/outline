import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import ConfirmationDialog from "~/components/ConfirmationDialog";

type Props = React.ComponentProps<typeof ConfirmationDialog> & {
  title: string;
  isAuthentication?: boolean;
};

function DisconnectAccountDialog({
  title,
  isAuthentication,
  onSubmit,
  ...props
}: Props) {
  const { t } = useTranslation();
  return (
    <ConfirmationDialog
      onSubmit={onSubmit}
      submitText={t("Confirm")}
      savingText={`${t("Disconnecting")}…`}
      {...props}
    >
      <Trans>
        Are you sure you want to disconnect your account from {{ title }}?
      </Trans>{" "}
      {isAuthentication ? (
        <Trans>You will no longer be able to sign in with this account.</Trans>
      ) : (
        <Trans>Associated functionality will be disabled.</Trans>
      )}
    </ConfirmationDialog>
  );
}

export default DisconnectAccountDialog;
