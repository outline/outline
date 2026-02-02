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
import JiraIcon from "./Icon";
import { JiraConnectButton } from "./components/JiraButton";

function Jira() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.Jira,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="Jira" icon={<JiraIcon />}>
      <Heading>Jira</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Jira to connect{" "}
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
      {env.JIRA_CONSUMER_KEY ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of Jira issues in documents by connecting your
              Jira account to {{ appName }}.
            </Trans>
          </Text>

          {integrations.jira?.length ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <JiraConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.jira.map((integration) => {
                  const jiraAccount = integration.settings?.jira?.instance.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={jiraAccount?.id}
                      small
                      title={jiraAccount?.name}
                      subtitle={
                        integrationCreatedBy
                          ? t("Connected by {{ name }}", {
                              name: integrationCreatedBy,
                            })
                          : undefined
                      }
                      image={
                        jiraAccount?.avatarUrl ? (
                          <TeamLogo
                            src={jiraAccount.avatarUrl}
                            size={AvatarSize.Small}
                          />
                        ) : (
                          <JiraIcon size={24} />
                        )
                      }
                      actions={
                        <ConnectedButton
                          integration={integration}
                          service={IntegrationService.Jira}
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
                <Trans>No Jira integrations connected.</Trans>
              </PlaceholderText>
              <JiraConnectButton icon={<PlusIcon />} />
            </>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            Jira integration is not configured. Please set JIRA_URL,
            JIRA_CONSUMER_KEY, and JIRA_CONSUMER_SECRET environment variables.
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

export default observer(Jira);
