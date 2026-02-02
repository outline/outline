import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import { AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import PlaceholderText from "~/components/PlaceholderText";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import TrelloIcon from "./Icon";
import { TrelloConnectButton } from "./components/TrelloButton";

function Trello() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.Trello,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="Trello" icon={<TrelloIcon />}>
      <Heading>Trello</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Trello to connect{" "}
            {{ appName }} to your workspace. Try again?
          </Trans>
        </Notice>
      )}
      {error === "unauthenticated" && (
        <Notice>
          <Trans>
            Something went wrong while authenticating your request. Please try
            logging in again.
          </Trans>
        </Notice>
      )}
      {env.TRELLO_API_KEY ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of Trello cards in documents by connecting your
              Trello account to {{ appName }}.
            </Trans>
          </Text>

          {integrations.trello?.length ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <TrelloConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.trello.map((integration) => {
                  const trelloAccount = integration.settings?.trello?.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={trelloAccount?.id}
                      small
                      title={trelloAccount?.name}
                      subtitle={
                        integrationCreatedBy
                          ? t("Connected by {{ name }}", {
                              name: integrationCreatedBy,
                            })
                          : undefined
                      }
                      image={
                        trelloAccount?.avatarUrl ? (
                          <TeamLogo
                            src={trelloAccount.avatarUrl}
                            size={AvatarSize.Small}
                          />
                        ) : (
                          <TrelloIcon size={24} />
                        )
                      }
                      actions={
                        <ConnectedButton
                          integration={integration}
                          service={IntegrationService.Trello}
                        />
                      }
                    />
                  );
                })}
              </List>
            </>
          ) : (
            <>
              <PlaceholderText>
                <Trans>No Trello integrations connected.</Trans>
              </PlaceholderText>
              <TrelloConnectButton icon={<PlusIcon />} />
            </>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            Trello integration is not configured. Please set TRELLO_API_KEY and
            TRELLO_API_SECRET environment variables.
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

export default observer(Trello);
