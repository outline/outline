import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import TeamLogo from "~/components/TeamLogo";
import Time from "~/components/Time";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import GitHubIcon from "./Icon";
import GitHubConnectButton from "./components/GitHubButton";

function GitHub() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");

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
            {{ appName: env.APP_NAME }} to your workspace. Try again?
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
      {env.GITHUB_CLIENT_ID ? (
        <>
          <SettingRow
            name="link"
            border={false}
            label={t("Connect account")}
            description={
              <Trans>
                Allow previews of GitHub issues, pull requests, and commits in
                documents by connecting a GitHub organization.
              </Trans>
            }
          >
            <Flex align="flex-end" column>
              <GitHubConnectButton />
            </Flex>
          </SettingRow>

          {integrations.github.length ? (
            <>
              <Heading as="h2">{t("Connected")}</Heading>
              <List>
                {integrations.github.map((integration) => {
                  const githubAccount =
                    integration.settings?.github?.installation.account;
                  const integrationCreatedBy = integration.user.name;

                  return (
                    <ListItem
                      key={githubAccount?.id}
                      small
                      title={githubAccount?.name}
                      subtitle={
                        <Trans>
                          Enabled by {{ integrationCreatedBy }} on{" "}
                          <Time
                            dateTime={integration.createdAt}
                            relative={false}
                            format={{ en_US: "MMMM d, y" }}
                          />
                        </Trans>
                      }
                      image={
                        <TeamLogo
                          src={githubAccount?.avatarUrl}
                          size={AvatarSize.Large}
                          showBorder={false}
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
          ) : null}
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
