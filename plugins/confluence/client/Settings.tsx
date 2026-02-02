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
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import ConfluenceIcon from "./Icon";
import { ConfluenceConnectButton } from "./components/ConfluenceButton";
import ConfluenceConfigurationForm from "./components/ConfluenceConfigurationForm";

function Confluence() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  const { data: config } = useRequest(
    async () => {
      const res = await client.post("/pluginConfigurations.info", {
        pluginId: "confluence",
      });
      return res?.data?.config || {};
    },
    true
  );

  // Check if configuration exists in DB or env
  const isConfigured =
    (config?.CONFLUENCE_CLIENT_ID || env.CONFLUENCE_CLIENT_ID) &&
    (config?.CONFLUENCE_URL || env.CONFLUENCE_URL);

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.Confluence,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="Confluence" icon={<ConfluenceIcon />}>
      <Heading>Confluence</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Confluence to connect{" "}
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
      {user.isAdmin && (
        <>
          <Heading as="h2">{t("Configuration")}</Heading>
          <ConfluenceConfigurationForm />
        </>
      )}

      {isConfigured ? (
        <>
          <Heading as="h2">
            {user.isAdmin ? t("Integrations") : t("Confluence")}
          </Heading>
          <Text as="p">
            <Trans>
              Enable previews of Confluence pages in documents by connecting
              your Confluence account to {{ appName }}.
            </Trans>
          </Text>

          {integrations.confluence?.length ? (
            <>
              <Heading as="h3">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <ConfluenceConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.confluence.map((integration) => {
                  const confluenceAccount =
                    integration.settings?.confluence?.instance.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={confluenceAccount?.id}
                      small
                      title={confluenceAccount?.name}
                      subtitle={
                        integrationCreatedBy
                          ? t("Connected by {{ name }}", {
                              name: integrationCreatedBy,
                            })
                          : undefined
                      }
                      image={
                        confluenceAccount?.avatarUrl ? (
                          <TeamLogo
                            src={confluenceAccount.avatarUrl}
                            size={AvatarSize.Small}
                          />
                        ) : (
                          <ConfluenceIcon size={24} />
                        )
                      }
                      actions={
                        <ConnectedButton
                          onClick={integration.delete}
                          confirmationMessage={t(
                            "Disconnecting will prevent previewing Confluence links from this workspace in documents. Are you sure?"
                          )}
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
                <Trans>No Confluence integrations connected.</Trans>
              </PlaceholderText>
              <ConfluenceConnectButton icon={<PlusIcon />} />
            </>
          )}
        </>
      ) : (
        !user.isAdmin && (
          <Notice>
            <Trans>
              Confluence integration is not configured. Please contact an
              administrator to configure it.
            </Trans>
          </Notice>
        )
      )}
    </IntegrationScene>
  );
}

export default observer(Confluence);
