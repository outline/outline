import { useTranslation } from "react-i18next";
import Button, { type Props } from "~/components/Button";
import useStores from "~/hooks/useStores";
import { GiteaConnectDialog } from "./GiteaConnectDialog";

/**
 * Button that opens a dialog to connect to a Gitea instance.
 */
export function GiteaConnectButton(props: Props<"button">) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleClick = () => {
    dialogs.openModal({
      title: t("Connect Gitea"),
      content: <GiteaConnectDialog />,
    });
  };

  return (
    <Button onClick={handleClick} neutral {...props}>
      {t("Connect")}
    </Button>
  );
}
