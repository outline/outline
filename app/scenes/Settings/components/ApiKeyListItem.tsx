import { observer } from "mobx-react";
import { CopyIcon } from "outline-icons";
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type ApiKey from "~/models/ApiKey";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import { HStack } from "~/components/primitives/HStack";
import useCurrentUser from "~/hooks/useCurrentUser";
import useUserLocale from "~/hooks/useUserLocale";
import ApiKeyMenu from "~/menus/ApiKeyMenu";
import { dateToExpiry } from "~/utils/date";

type Props = {
  /** The API key to display */
  apiKey: ApiKey;
};

const ApiKeyListItem = ({ apiKey }: Props) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const user = useCurrentUser();

  const creatorText =
    apiKey.userId === user.id
      ? ""
      : t(`by {{ name }}`, { name: apiKey.user.name });

  const subtitle = (
    <>
      {apiKey.isExpired ? (
        <>
          <Text type="danger">
            {t(`Expired`)} <Time dateTime={apiKey.expiresAt!} addSuffix />
          </Text>
          <Text type="tertiary"> {creatorText}</Text>
        </>
      ) : (
        <Text type="tertiary">
          {t(`Created`)} <Time dateTime={apiKey.createdAt} addSuffix />{" "}
          {creatorText}
        </Text>
      )}
      {apiKey.lastActiveAt && (
        <Text type="tertiary">
          {" "}
          &middot; {t("Last used")}{" "}
          <Time dateTime={apiKey.lastActiveAt} addSuffix />
        </Text>
      )}
      {!apiKey.isExpired && (
        <Text type="tertiary">
          {" "}
          &middot;{" "}
          {apiKey.expiresAt
            ? dateToExpiry(apiKey.expiresAt, t, userLocale)
            : t("No expiry")}
        </Text>
      )}
      {apiKey.scope && (
        <Tooltip
          content={apiKey.scope.map((s) => (
            <>
              {s}
              <br />
            </>
          ))}
        >
          <Text type="tertiary"> &middot; {t("Restricted scope")}</Text>
        </Tooltip>
      )}
    </>
  );

  const [copied, setCopied] = useState<boolean>(false);
  const copyTimeoutIdRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCopy = useCallback(() => {
    if (copyTimeoutIdRef.current) {
      clearTimeout(copyTimeoutIdRef.current);
    }
    setCopied(true);
    copyTimeoutIdRef.current = setTimeout(() => {
      setCopied(false);
    }, 3000);
    toast.message(t("API key copied to clipboard"));
  }, [t]);

  return (
    <ListItem
      key={apiKey.id}
      title={apiKey.name}
      subtitle={subtitle}
      actions={
        <HStack>
          {apiKey.value && handleCopy && (
            <CopyToClipboard text={apiKey.value} onCopy={handleCopy}>
              <Button type="button" icon={<CopyIcon />} neutral borderOnHover>
                {copied ? t("Copied") : t("Copy")}
              </Button>
            </CopyToClipboard>
          )}
          <Text
            type="tertiary"
            size="xsmall"
            style={{ marginRight: 8 }}
            monospace
          >
            {apiKey.obfuscatedValue}
          </Text>
          <ApiKeyMenu apiKey={apiKey} />
        </HStack>
      }
    />
  );
};

export default observer(ApiKeyListItem);
