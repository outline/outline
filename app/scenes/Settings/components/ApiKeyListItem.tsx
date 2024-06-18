import { CopyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ApiKey from "~/models/ApiKey";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
import ApiKeyMenu from "~/menus/ApiKeyMenu";

type Props = {
  apiKey: ApiKey;
};

const ApiKeyListItem = ({ apiKey }: Props) => {
  const { t } = useTranslation();
  const [linkCopied, setLinkCopied] = React.useState<boolean>(false);

  const subtitle = apiKey.lastUsedAt ? (
    <Text type={"tertiary"}>
      {t("Last used")} <Time dateTime={apiKey.lastUsedAt} addSuffix />
    </Text>
  ) : null;

  React.useEffect(() => {
    if (linkCopied) {
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }
  }, [linkCopied]);

  const handleCopy = React.useCallback(() => {
    setLinkCopied(true);
    toast.message(t("API token copied to clipboard"));
  }, [t]);

  return (
    <ListItem
      key={apiKey.id}
      title={apiKey.name}
      subtitle={subtitle}
      actions={
        <Flex align="center" gap={8}>
          <CopyToClipboard text={apiKey.secret} onCopy={handleCopy}>
            <Button type="button" icon={<CopyIcon />} neutral borderOnHover>
              {linkCopied ? t("Copied") : t("Copy")}
            </Button>
          </CopyToClipboard>
          <ApiKeyMenu apiKey={apiKey} />
        </Flex>
      }
    />
  );
};

export default ApiKeyListItem;
