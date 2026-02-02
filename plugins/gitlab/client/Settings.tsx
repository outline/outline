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
import GitLabIcon from "./Icon";
import GitLabConfigurationForm from "./components/GitLabConfigurationForm";
import { GitLabConnectButton } from "./components/GitLabButton";

function GitLab() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.GitLab,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="GitLab" icon={<GitLabIcon />}>
      <Heading>GitLab</Heading>

      <GitLabConfigurationForm />

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
      {error === "no_code" && (
        <Notice>
          <Trans>
            No authorization code was received from GitLab. Please try again.
          </Trans>
        </Notice>
      )}
      {error === "not_configured" && (
        <Notice>
          <Trans>
            GitLab integration is not configured for this team. Please fill in
            the GitLab settings above and try again.
          </Trans>
        </Notice>
      )}

      <Text as="p">
        <Trans>
          Enable previews of GitLab issues and merge requests in documents by
          connecting your GitLab account to {{ appName }}.
        </Trans>
      </Text>

      {integrations.gitlab?.length ? (
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
                integration.settings?.gitlab?.instance.account;
              const integrationCreatedBy = integration.user
                ? integration.user.name
                : undefined;

              return (
                <ListItem
                  key={gitlabAccount?.id}
                  small
                  title={gitlabAccount?.name}
                  subtitle={
                    integrationCreatedBy
                      ? t("Connected by {{ name }}", {
                          name: integrationCreatedBy,
                        })
                      : undefined
                  }
                  image={
                    gitlabAccount?.avatarUrl ? (
                      <TeamLogo
                        src={gitlabAccount.avatarUrl}
                        size={AvatarSize.Small}
                      />
                    ) : (
                      <GitLabIcon size={24} />
                    )
                  }
                  actions={
                    <ConnectedButton
                      integration={integration}
                      service={IntegrationService.GitLab}
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
            <Trans>No GitLab integrations connected.</Trans>
          </PlaceholderText>
          <GitLabConnectButton icon={<PlusIcon />} />
        </>
      )}
    </IntegrationScene>
  );
}

export default observer(GitLab);
