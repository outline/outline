import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import { AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import Time from "~/components/Time";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import LinearIcon from "./Icon";
import { LinearConnectButton } from "./components/LinearButton";

function Linear() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.Linear,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <Scene title="Linear" icon={<LinearIcon />}>
      <Heading>Linear</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Linear to connect{" "}
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
      {env.LINEAR_CLIENT_ID ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of Linear issues in documents by connecting a
              Linear workspace to {appName}.
            </Trans>
          </Text>
          {integrations.linear.length ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <LinearConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.linear.map((integration) => {
                  const linearWorkspace =
                    integration.settings?.linear?.workspace;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={linearWorkspace?.id}
                      small
                      title={linearWorkspace?.name}
                      subtitle={
                        integrationCreatedBy ? (
                          <>
                            <Trans>Enabled by {{ integrationCreatedBy }}</Trans>{" "}
                            &middot;{" "}
                            <Time
                              dateTime={integration.createdAt}
                              relative={false}
                              format={{ en_US: "MMMM d, y" }}
                            />
                          </>
                        ) : (
                          <PlaceholderText />
                        )
                      }
                      image={
                        <TeamLogo
                          src={linearWorkspace?.logoUrl}
                          size={AvatarSize.Large}
                        />
                      }
                      actions={
                        <ConnectedButton
                          onClick={integration.delete}
                          confirmationMessage={t(
                            "Disconnecting will prevent previewing Linear links from this workspace in documents. Are you sure?"
                          )}
                        />
                      }
                    />
                  );
                })}
              </List>
            </>
          ) : (
            <p>
              <LinearConnectButton icon={<LinearIcon />} />
            </p>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            The Linear integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            the integration.
          </Trans>
        </Notice>
      )}
    </Scene>
  );
}

export default observer(Linear);
