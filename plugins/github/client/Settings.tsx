import format from "date-fns/format";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import { dateLocale } from "@shared/utils/date";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import GitHubIcon from "./Icon";
import GitHubConnectButton from "./components/GitHubButton";

function GitHub() {
  const currentUser = useCurrentUser();
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
      <Text type="secondary">
        <Trans defaults="Get rich previews of GitHub links in documents" />
      </Text>
      {env.GITHUB_CLIENT_ID ? (
        <>
          <p>
            <GitHubConnectButton />
          </p>
          <p>&nbsp;</p>

          {integrations.github.length ? (
            <>
              <h2>{t("Connected accounts")}</h2>
              <Text as="p" type="secondary">
                <Trans>
                  GitHub links (pull requests, issues, and commits) accessible
                  to any of the following accounts, will get rich previews
                  inside {{ appName: env.APP_NAME }}.
                </Trans>
              </Text>

              <List>
                {integrations.github.map((integration) => {
                  const githubAccount =
                    integration.settings?.github?.installation.account;
                  const integrationCreatedBy = integration.user.name;
                  const integrationCreatedAt = format(
                    Date.parse(integration.createdAt),
                    "MMMM d, y",
                    { locale: dateLocale(currentUser.language) }
                  );
                  return (
                    <ListItem
                      key={githubAccount?.id}
                      small
                      title={githubAccount?.name}
                      subtitle={
                        <Trans>
                          Enabled by {{ integrationCreatedBy }} on{" "}
                          <Text type="tertiary">{integrationCreatedAt}</Text>
                        </Trans>
                      }
                      image={
                        <Avatar
                          src={githubAccount?.avatarUrl}
                          size={AvatarSize.Large}
                          showBorder={false}
                        />
                      }
                      actions={
                        <Button
                          onClick={integration.delete}
                          disabled={integration.isSaving}
                          neutral
                        >
                          {t("Disconnect")}
                        </Button>
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
