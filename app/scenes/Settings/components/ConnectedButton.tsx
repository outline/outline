import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button, { Props as ButtonProps } from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
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

const ConnectedIcon = styled.div`
  width: 24px;
  height: 24px;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    background-color: ${s("accent")};
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
`;
