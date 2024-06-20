import { CopyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
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

  const subtitle = (
    <>
      <Text type="tertiary">
        {t(`Created`)} <Time dateTime={apiKey.createdAt} addSuffix /> &middot;{" "}
      </Text>
      {apiKey.lastActiveAt && (
        <Text type={"tertiary"}>
          {t("Last used")} <Time dateTime={apiKey.lastActiveAt} addSuffix />{" "}
          &middot;{" "}
        </Text>
      )}
      <Text type={apiKey.isExpired ? "danger" : "tertiary"}>
        {apiKey.expiresAt
          ? dateToExpiry(apiKey.expiresAt, t, userLocale)
          : t("No expiry")}
      </Text>
    </>
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
