import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import { AvatarSize } from "~/components/Avatar";
import Heading from "~/components/Heading";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import FigmaIcon from "./Icon";
import { FigmaConnectButton } from "./components/FigmaButton";
import { IntegrationService, IntegrationType } from "@shared/types";
import type Integration from "~/models/Integration";
import Time from "~/components/Time";

function Figma() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const appName = env.APP_NAME;

  const linkedAccountIntegration = integrations.find({
    type: IntegrationType.LinkedAccount,
    service: IntegrationService.Figma,
  }) as Integration<IntegrationType.LinkedAccount> | undefined;

  const figmaAccount = linkedAccountIntegration?.settings?.figma?.account;

  return (
    <IntegrationScene title="Figma" icon={<FigmaIcon />}>
      <Heading>Figma</Heading>

      {error === "access_denied" && (
        <Notice>
          <Trans>
            Whoops, you need to accept the permissions in Figma to connect{" "}
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
      {error === "unknown" && (
        <Notice>
          <Trans>
            Something went wrong while processing your request. Please try
            again.
          </Trans>
        </Notice>
      )}
      {env.FIGMA_CLIENT_ID ? (
        <>
          <Text as="p">
            <Trans>
              Link your {{ appName }} account to Figma to enable previews of
              design files you have access to, directly within documents.
            </Trans>
          </Text>
          {linkedAccountIntegration ? (
            <List>
              <ListItem
                small
                title={`${figmaAccount?.name} (${figmaAccount?.email})`}
                subtitle={
                  <>
                    <Trans>Enabled on</Trans>{" "}
                    <Time
                      dateTime={linkedAccountIntegration.createdAt}
                      relative={false}
                      format={{ en_US: "MMMM d, y" }}
                    />
                  </>
                }
                image={
                  <TeamLogo
                    src={
                      linkedAccountIntegration.settings?.figma?.account
                        ?.avatarUrl
                    }
                    size={AvatarSize.Large}
                  />
                }
                actions={
                  <ConnectedButton
                    onClick={linkedAccountIntegration.delete}
                    confirmationMessage={t(
                      "Disconnecting will prevent previewing Figma design files from this account in documents. Are you sure?"
                    )}
                  />
                }
              />
            </List>
          ) : (
            <p>
              <FigmaConnectButton icon={<FigmaIcon />} />
            </p>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            The Figma integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            the integration.
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

export default observer(Figma);
