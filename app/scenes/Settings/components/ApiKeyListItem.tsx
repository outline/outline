import { observer } from "mobx-react";
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
import Tooltip from "~/components/Tooltip";
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

  const subtitle = (
    <>
      <Text type="tertiary">
        {t(`Created`)} <Time dateTime={apiKey.createdAt} addSuffix />{" "}
        {apiKey.userId === user.id
          ? ""
          : t(`by {{ name }}`, { name: user.name })}{" "}
        &middot;{" "}
      </Text>
      {apiKey.lastActiveAt && (
        <Text type="tertiary">
          {t("Last used")} <Time dateTime={apiKey.lastActiveAt} addSuffix />{" "}
          &middot;{" "}
        </Text>
      )}
      <Text type={apiKey.isExpired ? "danger" : "tertiary"}>
        {apiKey.expiresAt
          ? dateToExpiry(apiKey.expiresAt, t, userLocale)
          : t("No expiry")}
        {apiKey.scope && <> &middot; </>}
      </Text>
      {apiKey.scope && (
        <Tooltip
          content={apiKey.scope.map((s) => (
            <>
              {s}
              <br />
            </>
          ))}
        >
          <Text type="tertiary">{t("Restricted scope")}</Text>
        </Tooltip>
      )}
    </>
  );

  const [copied, setCopied] = React.useState<boolean>(false);
  const copyTimeoutIdRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleCopy = React.useCallback(() => {
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
        <Flex align="center" gap={8}>
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
        </Flex>
      }
    />
  );
};

export default observer(ApiKeyListItem);
