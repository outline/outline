import { isPast } from "date-fns";
import { CopyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import useUserLocale from "~/hooks/useUserLocale";
import ApiKeyMenu from "~/menus/ApiKeyMenu";
import { dateToExpiry } from "~/utils/date";

type Props = {
  apiKey: ApiKey;
  isCopied: boolean;
  onCopy: (keyId: string) => void;
};

const ApiKeyListItem = ({ apiKey, isCopied, onCopy }: Props) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale();

  const hasExpired = apiKey.expiryAt
    ? isPast(new Date(apiKey.expiryAt))
    : false;

  const subtitle = (
    <Text type={hasExpired ? "danger" : "tertiary"}>
      {apiKey.expiryAt
        ? dateToExpiry(apiKey.expiryAt, t, userLocale)
        : t("No expiry")}
    </Text>
  );

  const handleCopy = React.useCallback(() => {
    onCopy(apiKey.id);
  }, [apiKey.id, onCopy]);

  return (
    <ListItem
      key={apiKey.id}
      title={apiKey.name}
      subtitle={subtitle}
      actions={
        <Flex align="center" gap={8}>
          <CopyToClipboard text={apiKey.secret} onCopy={handleCopy}>
            <Button type="button" icon={<CopyIcon />} neutral borderOnHover>
              {isCopied ? t("Copied") : t("Copy")}
            </Button>
          </CopyToClipboard>
          <ApiKeyMenu apiKey={apiKey} />
        </Flex>
      }
    />
  );
};

export default ApiKeyListItem;
