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
import Time from "~/components/Time";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import GitLabIcon from "./components/Icon";
import { GitLabConnectButton } from "./components/GitLabButton";

function GitLab() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const installRequest = query.get("install_request");
  const appName = env.APP_NAME;
  const gitlabAppName = env.GITLAB_APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.GitLab,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="GitLab" icon={<GitLabIcon />}>
      <Heading>GitLab</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in GitLab to connect{" "}
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
            The owner of GitLab account has been requested to install the{" "}
            {{ gitlabAppName }} GitLab app. Once approved, previews will be
            shown for respective links.
          </Trans>
        </Notice>
      )}
      {env.GITLAB_CLIENT_ID ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of GitLab issues and merge requests in documents
              by connecting a GitLab organization or specific repositories to{" "}
              {appName}.
            </Trans>
          </Text>

          {integrations.gitlab.length ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <GitLabConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.gitlab.map((integration) => {
                  const gitlabAccount =
                    integration.settings?.gitlab?.installation.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    <ListItem
                      key={gitlabAccount?.id}
                      small
                      title={gitlabAccount?.name}
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
                          src={gitlabAccount?.avatarUrl}
                          size={AvatarSize.Large}
                        />
                      }
                      actions={
                        <ConnectedButton
                          onClick={integration.delete}
                          confirmationMessage={t(
                            "Disconnecting will prevent previewing GitLab links from this organization in documents. Are you sure?"
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
              <GitLabConnectButton icon={<GitLabIcon />} />
            </p>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            The GitLab integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            the integration.
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

export default observer(GitLab);
