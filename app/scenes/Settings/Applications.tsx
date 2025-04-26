import { observer } from "mobx-react";
import { InternetIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import OAuthClient from "~/models/oauth/OAuthClient";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { createOAuthClient } from "~/actions/definitions/oauthClients";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import OAuthClientListItem from "./components/OAuthClientListItem";

function Applications() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { oauthClients } = useStores();
  const can = usePolicy(team);
  const context = useActionContext();

  return (
    <Scene
      title={t("Applications")}
      icon={<InternetIcon />}
      actions={
        <>
          {can.createOAuthClient && (
            <Action>
              <Button
                type="submit"
                value={`${t("New App")}…`}
                action={createOAuthClient}
                context={context}
              />
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Applications")}</Heading>
      <Text as="p" type="secondary">
        <Trans
          defaults="Applications allow you to build internal or public integrations with Outline and provide secure access via OAuth. For more details see the <em>developer documentation</em>."
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
      <PaginatedList<OAuthClient>
        fetch={oauthClients.fetchPage}
        items={oauthClients.orderedData}
        renderItem={(oauthClient) => (
          <OAuthClientListItem key={oauthClient.id} oauthClient={oauthClient} />
        )}
      />
    </Scene>
  );
}

export default observer(Applications);
