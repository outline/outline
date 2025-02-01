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
import GitHubIcon from "./Icon";
import { GitHubConnectButton } from "./components/GitHubButton";

function GitHub() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const installRequest = query.get("install_request");
  const appName = env.APP_NAME;
  const githubAppName = env.GITHUB_APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.GitHub,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <Scene title="GitHub" icon={<GitHubIcon />}>
      <Heading>GitHub</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in GitHub to connect{" "}
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
      {installRequest === "true" && (
        <Notice>
          <Trans>
            The owner of GitHub account has been requested to install the{" "}
            {{ githubAppName }} GitHub app. Once approved, previews will be
            shown for respective links.
          </Trans>
        </Notice>
      )}
      {env.GITHUB_CLIENT_ID ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of GitHub issues and pull requests in documents by
              connecting a GitHub organization or specific repositories to{" "}
              {appName}.
            </Trans>
          </Text>

          {integrations.github.length ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <GitHubConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.github.map((integration) => {
                  const githubAccount =
                    integration.settings?.github?.installation.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={githubAccount?.id}
                      small
                      title={githubAccount?.name}
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
                          src={githubAccount?.avatarUrl}
                          size={AvatarSize.Large}
                        />
                      }
                      actions={
                        <ConnectedButton
                          onClick={integration.delete}
                          confirmationMessage={t(
                            "Disconnecting will prevent previewing GitHub links from this organization in documents. Are you sure?"
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
              <GitHubConnectButton icon={<GitHubIcon />} />
            </p>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            The GitHub integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            the integration.
          </Trans>
        </Notice>
      )}
    </Scene>
  );
}

export default observer(GitHub);
