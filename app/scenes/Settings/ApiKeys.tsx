import { observer } from "mobx-react";
import { CodeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import ApiKey from "~/models/ApiKey";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { createApiKey } from "~/actions/definitions/apiKeys";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import ApiKeyListItem from "./components/ApiKeyListItem";

function ApiKeys() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { apiKeys } = useStores();
  const can = usePolicy(team);
  const context = useActionContext();

  const [copiedKeyId, setCopiedKeyId] = React.useState<string | null>();
  const copyTimeoutIdRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleCopy = React.useCallback(
    (keyId: string) => {
      if (copyTimeoutIdRef.current) {
        clearTimeout(copyTimeoutIdRef.current);
      }
      setCopiedKeyId(keyId);
      copyTimeoutIdRef.current = setTimeout(() => {
        setCopiedKeyId(null);
      }, 3000);
      toast.message(t("API token copied to clipboard"));
    },
    [t]
  );

  return (
    <Scene
      title={t("API Keys")}
      icon={<CodeIcon />}
      actions={
        <>
          {can.createApiKey && (
            <Action>
              <Button
                type="submit"
                value={`${t("New API key")}…`}
                action={createApiKey}
                context={context}
              />
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("API Keys")}</Heading>
      <Text as="p" type="secondary">
        <Trans
          defaults="Create personal API keys to authenticate with the API and programatically control
          your workspace's data. API keys have the same permissions as your user account.
          For more details see the <em>developer documentation</em>."
          components={{
            em: (
              <a
                href="https://www.getoutline.com/developers"
                target="_blank"
                rel="noreferrer"
              />
            ),
          }}
        />
      </Text>
      <PaginatedList
        fetch={apiKeys.fetchPage}
        items={apiKeys.orderedData}
        heading={<h2>{t("Generated Keys")}</h2>}
        renderItem={(apiKey: ApiKey) => (
          <ApiKeyListItem
            key={apiKey.id}
            apiKey={apiKey}
            isCopied={apiKey.id === copiedKeyId}
            onCopy={handleCopy}
          />
        )}
      />
    </Scene>
  );
}

export default observer(ApiKeys);
