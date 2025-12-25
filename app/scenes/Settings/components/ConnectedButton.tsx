import * as React from "react";
import { useTranslation } from "react-i18next";
import type { Props as ButtonProps } from "~/components/Button";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { ConnectedIcon } from "~/components/Icons/ConnectedIcon";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = ButtonProps<HTMLButtonElement> & {
  confirmationMessage: React.ReactNode;
  onClick: () => Promise<void> | void;
};

export function ConnectedButton({
  onClick,
  confirmationMessage,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleClick = () => {
    dialogs.openModal({
      title: t("Disconnect integration"),
      content: (
        <ConfirmDisconnectDialog
          confirmationMessage={confirmationMessage}
          onSubmit={onClick}
        />
      ),
    });
  };

  return (
    <Button icon={<ConnectedIcon />} neutral onClick={handleClick} {...rest}>
      {t("Connected")}
    </Button>
  );
}

function ConfirmDisconnectDialog({
  confirmationMessage,
  onSubmit,
}: {
  confirmationMessage: React.ReactNode;
  onSubmit: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmationDialog
      onSubmit={onSubmit}
      submitText={t("Disconnect")}
      savingText={`${t("Disconnecting")}…`}
      danger
    >
      <Text as="p" type="secondary">
        {confirmationMessage}
      </Text>
    </ConfirmationDialog>
  );
}
