import { CopyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import ListItem from "~/components/List/Item";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import TokenRevokeDialog from "./TokenRevokeDialog";

type Props = {
  token: ApiKey;
};

const TokenListItem = ({ token }: Props) => {
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const { dialogs } = useStores();
  const [linkCopied, setLinkCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (linkCopied) {
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }
  }, [linkCopied]);

  const handleCopy = React.useCallback(() => {
    setLinkCopied(true);
    showToast(t("API token copied to clipboard"), {
      type: "success",
    });
  }, [showToast, t]);

  const showRevokeConfirmation = React.useCallback(() => {
    dialogs.openModal({
      title: t("Revoke token"),
      isCentered: true,
      content: (
        <TokenRevokeDialog onSubmit={dialogs.closeAllModals} token={token} />
      ),
    });
  }, [t, dialogs, token]);

  return (
    <ListItem
      key={token.id}
      title={token.name}
      subtitle={<code>{token.secret}</code>}
      actions={
        <>
          <CopyToClipboard text={token.secret} onCopy={handleCopy}>
            <Button type="button" icon={<CopyIcon />} neutral borderOnHover>
              {linkCopied ? t("Copied") : t("Copy")}
            </Button>
          </CopyToClipboard>
          <Button onClick={showRevokeConfirmation} neutral>
            Revoke
          </Button>
        </>
      }
    />
  );
};

export default TokenListItem;
