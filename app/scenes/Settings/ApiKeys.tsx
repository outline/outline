import { observer } from "mobx-react";
import { CodeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
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

  return (
    <Scene
      title={t("API")}
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
          defaults="API keys can be used to authenticate with the API and programatically control
          your workspace's data. For more details see the <em>developer documentation</em>."
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
      <PaginatedList<ApiKey>
        fetch={apiKeys.fetchPage}
        items={apiKeys.orderedData}
        renderItem={(apiKey) => (
          <ApiKeyListItem key={apiKey.id} apiKey={apiKey} />
        )}
      />
    </Scene>
  );
}

export default observer(ApiKeys);
