// @flow
import { find } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";

import getQueryVariable from "shared/utils/getQueryVariable";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import CollectionIcon from "components/CollectionIcon";
import HelpText from "components/HelpText";
import List from "components/List";
import ListItem from "components/List/Item";
import Notice from "components/Notice";
import PageTitle from "components/PageTitle";
import SlackButton from "./components/SlackButton";
import env from "env";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";

function Slack() {
  const team = useCurrentTeam();
  const { collections, integrations } = useStores();
  const { t } = useTranslation();
  const error = getQueryVariable("error");

  React.useEffect(() => {
    collections.fetchPage({ limit: 100 });
    integrations.fetchPage({ limit: 100 });
  }, [collections, integrations]);

  const commandIntegration = find(integrations.slackIntegrations, {
    type: "command",
  });

  return (
    <CenteredContent>
      <PageTitle title="Slack" />
      <h1>Slack</h1>
      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Slack to connect
            Outline to your team. Try again?
          </Trans>
        </Notice>
      )}
      {error === "unauthenticated" && (
        <Notice>
          <Trans>
            Something went wrong while authenticating your request. Please try
            logging in again?
          </Trans>
        </Notice>
      )}
      <HelpText>
        <Trans
          defaults="Get rich previews of Outline links shared in Slack and use the <em>{{ command }}</em> slash command to search for documents without leaving your chat."
          values={{ command: "/outline" }}
          components={{ em: <Code /> }}
        />
      </HelpText>
      <p>
        {commandIntegration ? (
          <Button onClick={commandIntegration.delete}>Disconnect</Button>
        ) : (
          <SlackButton
            scopes={["commands", "links:read", "links:write"]}
            redirectUri={`${env.URL}/auth/slack.commands`}
            state={team.id}
          />
        )}
      </p>
      <p>&nbsp;</p>

      <h2>{t("Collections")}</h2>
      <HelpText>
        <Trans>
          Connect Outline collections to Slack channels and messages will be
          automatically posted to Slack when documents are published or updated.
        </Trans>
      </HelpText>

      <List>
        {collections.orderedData.map((collection) => {
          const integration = find(integrations.slackIntegrations, {
            collectionId: collection.id,
          });

          if (integration) {
            return (
              <ListItem
                key={integration.id}
                title={collection.name}
                image={<CollectionIcon collection={collection} />}
                subtitle={
                  <Trans
                    defaults={`Connected to the <em>{{ channelName }}</em> channel`}
                    values={{ channelName: integration.settings.channel }}
                    components={{ em: <strong /> }}
                  />
                }
                actions={
                  <Button onClick={integration.delete}>
                    {t("Disconnect")}
                  </Button>
                }
              />
            );
          }

          return (
            <ListItem
              key={collection.id}
              title={collection.name}
              image={<CollectionIcon collection={collection} />}
              actions={
                <SlackButton
                  scopes={["incoming-webhook"]}
                  redirectUri={`${env.URL}/auth/slack.post`}
                  state={collection.id}
                  label={t("Connect")}
                />
              }
            />
          );
        })}
      </List>
    </CenteredContent>
  );
}

const Code = styled.code`
  padding: 4px 6px;
  margin: 0 2px;
  background: ${(props) => props.theme.codeBackground};
  border-radius: 4px;
`;

export default observer(Slack);
