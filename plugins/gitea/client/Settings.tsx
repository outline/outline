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
import GiteaIcon from "./components/Icon";
import { GiteaConnectButton } from "./components/GiteaButton";

function Gitea() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  React.useEffect(() => {
    void integrations.fetchAllIfNeeded({
      service: IntegrationService.Gitea,
      withRelations: true,
    });
  }, [integrations]);

  const connected = integrations
    .filterByService(IntegrationService.Gitea)
    .filter((integration) => integration.settings.gitea?.installation);

  return (
    <IntegrationScene title="Gitea" icon={<GiteaIcon />}>
      <Heading>Gitea</Heading>

      {error && (
        <Notice>
          {error === "access_denied" ? (
            <Trans>
              You need to accept the permissions in Gitea to connect{" "}
              {{ appName }} to your workspace. Try again?
            </Trans>
          ) : (
            <Trans>
              Something went wrong while authenticating your request. Please try
              again.
            </Trans>
          )}
        </Notice>
      )}
      <Text as="p">
        <Trans>
          Enable previews of Gitea issues, pull requests, and repositories in
          documents by connecting a Gitea or Forgejo instance to {{ appName }}.
        </Trans>
      </Text>

      {connected.length ? (
        <>
          <Heading as="h2">
            <Flex justify="space-between" auto>
              {t("Connected")}
              <GiteaConnectButton icon={<PlusIcon />} />
            </Flex>
          </Heading>
          <List>
            {connected.map((integration) => {
              const settings = integration.settings.gitea;
              const account = settings?.installation?.account;
              const integrationCreatedBy = integration.user
                ? integration.user.name
                : undefined;

              return (
                account && (
                  <ListItem
                    key={integration.id}
                    small
                    title={account.name}
                    subtitle={
                      integrationCreatedBy ? (
                        <>
                          {settings.url} &middot;{" "}
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
                        src={account.avatarUrl}
                        size={AvatarSize.Large}
                      />
                    }
                    actions={
                      <ConnectedButton
                        onClick={integration.delete}
                        confirmationMessage={t(
                          "Disconnecting will prevent previewing links from Gitea in documents. Are you sure?"
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
          <GiteaConnectButton icon={<GiteaIcon />} />
        </p>
      )}
    </IntegrationScene>
  );
}

export default observer(Gitea);
