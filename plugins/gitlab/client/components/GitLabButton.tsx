import * as React from "react";
import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useStores from "~/hooks/useStores";
import GitLabConnectDialog from "./GitLabConnectDialog";

/**
 * Button that opens a dialog to connect to GitLab Cloud or a self-managed instance.
 */
export function GitLabConnectButton(props: Props<HTMLButtonElement>) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleClick = () => {
    dialogs.openModal({
      title: t("Connect GitLab"),
      content: <GitLabConnectDialog />,
    });
  };

  return (
    <Button onClick={handleClick} neutral {...props}>
      {t("Connect")}
    </Button>
  );
}
