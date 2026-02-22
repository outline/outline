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

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.GitLab,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="GitLab" icon={<GitLabIcon />}>
      <Heading>GitLab</Heading>

      {error && (
        <Notice>
          {error === "access_denied" ? (
            <Trans>
              You need to accept the permissions in GitLab to connect{" "}
              {{ appName }} to your workspace. Try again?
            </Trans>
          ) : error === "duplicate_account" ? (
            <Trans>
              The GitLab account is already connected to this workspace.
            </Trans>
          ) : (
            <Trans>
              Something went wrong while authenticating your request. Please try
              again.
            </Trans>
          )}
        </Notice>
      )}
      {installRequest === "true" && (
        <Notice>
          <Trans>
            The owner of GitLab account has been requested to install the
            application. Once approved, the connection will be completed.
          </Trans>
        </Notice>
      )}
      <Text as="p">
        <Trans>
          Enable previews of GitLab issues and merge requests in documents by
          connecting a GitLab organization or specific repositories to {appName}
          .
        </Trans>
      </Text>

      {integrations.gitlab.some((int) => int.settings.gitlab?.installation) ? (
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
                integration.settings?.gitlab?.installation?.account;
              const integrationCreatedBy = integration.user
                ? integration.user.name
                : undefined;

              const customUrl = integration.settings?.gitlab?.url;

              return (
                gitlabAccount && (
                  <ListItem
                    key={gitlabAccount?.id}
                    small
                    title={gitlabAccount?.name}
                    subtitle={
                      integrationCreatedBy ? (
                        <>
                          {customUrl && <>{customUrl} &middot; </>}
                          <Trans>
                            Enabled by {{ integrationCreatedBy }}
                          </Trans>{" "}
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
                          "Disconnecting will prevent previewing links from GitLab in documents. Are you sure?"
                        )}
                      />
                    }
                  />
                )
              );
            })}
          </List>
        </>
      ) : (
        <p>
          <GitLabConnectButton icon={<GitLabIcon />} />
        </p>
      )}
    </IntegrationScene>
  );
}

export default observer(GitLab);
