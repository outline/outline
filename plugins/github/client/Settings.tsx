import format from "date-fns/format";
import filter from "lodash/filter";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService, IntegrationType } from "@shared/types";
import { dateLocale } from "@shared/utils/date";
import Integration from "~/models/Integration";
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
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import GitHubIcon from "./Icon";
import GitHubButton from "./components/GitHubButton";

function GitHub() {
  const team = useCurrentTeam();
  const currentUser = useCurrentUser();
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const [relationsLoaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    void integrations.fetchAll({ service: IntegrationService.GitHub });
  }, [integrations]);

  React.useEffect(() => {
    const loadRelations = async () => {
      if (integrations.orderedData.length) {
        await Promise.all(
          integrations.orderedData.map((integration) =>
            integration.loadRelations()
          )
        );
      }
      setLoaded(true);
    };

    if (!relationsLoaded) {
      void loadRelations();
    }
  }, [integrations.orderedData, relationsLoaded]);

  const githubIntegrations = React.useMemo(
    (): Integration<IntegrationType.Embed>[] =>
      relationsLoaded
        ? filter(
            integrations.orderedData,
            (i) =>
              i.service === IntegrationService.GitHub && i.teamId === team.id
          )
        : [],
    [integrations.orderedData, relationsLoaded]
  );

  if (!relationsLoaded) {
    return null;
  }

  const appName = env.APP_NAME;

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
      <Text type="secondary">
        <Trans defaults="Get rich previews of GitHub links in documents" />
      </Text>
      {env.GITHUB_CLIENT_ID ? (
        <>
          <p>
            <GitHubButton
              redirectUri={`${env.URL}/api/github.callback`}
              state={team.id}
              label={
                githubIntegrations.length
                  ? t("Connect another account")
                  : t("Connect GitHub")
              }
              icon={<GitHubIcon />}
            />
          </p>
          <p>&nbsp;</p>

          {githubIntegrations.length ? (
            <>
              <h2>{t("Connected accounts")}</h2>
              <Text as="p" type="secondary">
                <Trans>
                  GitHub links (pull requests, issues, and commits) accessible
                  to any of the following accounts, will get rich previews
                  inside {{ appName }}.
                </Trans>
              </Text>

              <List>
                {githubIntegrations.map((integration) => {
                  const account =
                    integration.settings?.github?.installation.account;
                  const user = integration.user.name;
                  const day = format(
                    Date.parse(integration.createdAt),
                    "MMMM d, y",
                    { locale: dateLocale(currentUser.language) }
                  );
                  return (
                    <ListItem
                      key={account?.id}
                      small
                      title={account?.name}
                      subtitle={
                        <Trans>
                          Enabled by {{ user }} on{" "}
                          <Text type="tertiary">{day}</Text>
                        </Trans>
                      }
                      image={
                        <Avatar
                          src={account?.avatarUrl}
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
