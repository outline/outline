import format from "date-fns/format";
import filter from "lodash/filter";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService, IntegrationType } from "@shared/types";
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
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import GithubIcon from "./Icon";
import GithubButton from "./components/GithubButton";

function Github() {
  const team = useCurrentTeam();
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const [relationsLoaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    void integrations.fetchPage({
      service: IntegrationService.GitHub,
      limit: 100,
    });
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
    <Scene title="GitHub" icon={<GithubIcon />}>
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
            <GithubButton
              redirectUri={`${env.URL}/api/github.callback`}
              state={team.id}
              label={
                githubIntegrations.length
                  ? t("Connect another account")
                  : t("Connect GitHub")
              }
              icon={<GithubIcon />}
            />
          </p>
          <p>&nbsp;</p>

          {githubIntegrations.length ? (
            <>
              <h2>{t("Connected accounts")}</h2>
              <Text as="p" type="secondary">
                <Trans>
                  GitHub links(pull request, issues etc.) accessible to any of
                  the following accounts, will get rich previews inside{" "}
                  {{ appName }}.
                </Trans>
              </Text>

              <List>
                {githubIntegrations.map((integration) => {
                  const account =
                    integration.settings?.github?.installation.account;
                  const user = integration.user.name;
                  const day = format(
                    new Date(integration.createdAt),
                    "MMMM d, y"
                  );
                  return (
                    <ListItem
                      key={account?.id}
                      small
                      title={account?.name}
                      subtitle={
                        <Trans>
                          Enabled by {{ user }} on {{ day }}
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
                        <Button onClick={integration.delete} neutral>
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

export default observer(Github);
