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
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import ApiKeyListItem from "./components/ApiKeyListItem";

function PersonalApiKeys() {
  const team = useCurrentTeam();
  const user = useCurrentUser();
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
      <Heading>{t("API")}</Heading>
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
        items={apiKeys.personalApiKeys}
        options={{ userId: user.id }}
        heading={<h2>{t("Personal keys")}</h2>}
        renderItem={(apiKey: ApiKey) => (
          <ApiKeyListItem key={apiKey.id} apiKey={apiKey} />
        )}
      />
    </Scene>
  );
}

export default observer(PersonalApiKeys);
