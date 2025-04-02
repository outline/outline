import { observer } from "mobx-react";
import { CopyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import OAuthClient from "~/models/OAuthClient";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";

type Props = {
  oauthClient: OAuthClient;
};

const OAuthClientListItem = ({ oauthClient }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const subtitle = (
    <>
      <Text type="tertiary">
        {t(`Created`)} <Time dateTime={oauthClient.createdAt} addSuffix />{" "}
        {oauthClient.createdById === user.id
          ? ""
          : t(`by {{ name }}`, { name: user.name })}
      </Text>
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
    toast.message(t("Client secret copied to clipboard"));
  }, [t]);

  return (
    <ListItem
      key={oauthClient.id}
      title={oauthClient.name}
      subtitle={subtitle}
      actions={
        <Flex align="center" gap={8}>
          {oauthClient.clientSecret && handleCopy && (
            <CopyToClipboard
              text={oauthClient.clientSecret}
              onCopy={handleCopy}
            >
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
            ***
          </Text>
          {/* <OAuthClientMenu oauthClient={oauthClient} /> */}
        </Flex>
      }
    />
  );
};

export default observer(OAuthClientListItem);
