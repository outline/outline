import find from "lodash/find";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
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

  React.useEffect(() => {
    void integrations.fetchPage({
      limit: 100,
    });
  }, [integrations]);

  const githubIntegration = find(
    integrations.orderedData,
    (i) => i.service === IntegrationService.Github
  );

  const appName = env.APP_NAME;

  return (
    <Scene title="GitHub" icon={<GithubIcon />}>
      <Heading>GitHub</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Github to connect{" "}
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
            {githubIntegration ? (
              <Button onClick={() => githubIntegration.delete()}>
                {t("Disconnect")}
              </Button>
            ) : (
              <GithubButton
                redirectUri={`${env.URL}/api/github.callback`}
                state={team.id}
                icon={<GithubIcon />}
              />
            )}
          </p>
          <p>&nbsp;</p>
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
