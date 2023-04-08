import { CopyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import useToasts from "~/hooks/useToasts";
import ApiKeyMenu from "~/menus/ApiKeyMenu";

type Props = {
  token: ApiKey;
};

const TokenListItem = ({ token }: Props) => {
  const { t } = useTranslation();
  const { showToast } = useToasts();
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

  return (
    <ListItem
      key={token.id}
      title={token.name}
      subtitle={<code>{token.secret.slice(0, 15)}…</code>}
      actions={
        <Flex align="center" gap={8}>
          <CopyToClipboard text={token.secret} onCopy={handleCopy}>
            <Button type="button" icon={<CopyIcon />} neutral borderOnHover>
              {linkCopied ? t("Copied") : t("Copy")}
            </Button>
          </CopyToClipboard>
          <ApiKeyMenu token={token} />
        </Flex>
      }
    />
  );
};

export default TokenListItem;
