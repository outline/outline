import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import ApiKey from "~/models/ApiKey";
import OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { createApiKey } from "~/actions/definitions/apiKeys";
import env from "~/env";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import ApiKeyListItem from "./components/ApiKeyListItem";
import OAuthAuthenticationListItem from "./components/OAuthAuthenticationListItem";

function APIAndApps() {
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const { apiKeys, oauthAuthentications } = useStores();
  const can = usePolicy(team);
  const context = useActionContext();
  const appName = env.APP_NAME;

  return (
    <Scene
      title={t("API & Apps")}
      icon={<PadlockIcon />}
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
      <Heading>{t("API & Apps")}</Heading>
      <h2>{t("API keys")}</h2>
      {can.createApiKey ? (
        <Text as="p" type="secondary">
          <Trans
            defaults="Create personal API keys to authenticate with the API and programatically control
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
      ) : (
        <Trans>
          {t("API keys have been disabled by an admin for your account")}
        </Trans>
      )}
      <PaginatedList<ApiKey>
        fetch={apiKeys.fetchPage}
        items={apiKeys.personalApiKeys}
        options={{ userId: user.id }}
        renderItem={(apiKey) => (
          <ApiKeyListItem key={apiKey.id} apiKey={apiKey} />
        )}
      />
      <PaginatedList
        fetch={oauthAuthentications.fetchPage}
        items={oauthAuthentications.orderedData}
        heading={
          <>
            <h2>{t("Application access")}</h2>
            <Text as="p" type="secondary">
              {t(
                "Manage which third-party and internal applications have been granted access to your {{ appName }} account.",
                { appName }
              )}
            </Text>
          </>
        }
        renderItem={(oauthAuthentication: OAuthAuthentication) => (
          <OAuthAuthenticationListItem
            key={oauthAuthentication.id}
            oauthAuthentication={oauthAuthentication}
          />
        )}
      />
    </Scene>
  );
}

export default observer(APIAndApps);
