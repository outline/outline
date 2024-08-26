import { observer } from "mobx-react";
import React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { IntegrationService, IntegrationType } from "@shared/types";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import IntegrationWebhook, {
  RenderConnectProps,
} from "~/components/IntegrationWebhook";
import Scene from "~/components/Scene";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useUnmount from "~/hooks/useUnmount";
import MattermostIcon from "./Icon";
import AddConnectionDialog from "./components/Connection/AddConnectionDialog";
import DisconnectDialogMessage from "./components/DisconnectDialogMessage";
import ConnectWebhookButton from "./components/Webhook/ConnectWebhookButton";
import { channels } from "./utils/ChannelsStore";

const MatterMost = () => {
  const appName = env.APP_NAME;

  const { t } = useTranslation();
  const { collections, dialogs, integrations } = useStores();

  const team = useCurrentTeam();
  const can = usePolicy(team);

  const linkedAccountIntegration = integrations.find({
    service: IntegrationService.Mattermost,
    type: IntegrationType.LinkedAccount,
  });

  const handleAddConnection = React.useCallback(() => {
    dialogs.openModal({
      title: t("Connect to Mattermost"),
      content: <AddConnectionDialog onSubmit={dialogs.closeAllModals} />,
    });
  }, [dialogs]);

  const handleRemoveConnection = React.useCallback(async () => {
    if (linkedAccountIntegration) {
      await linkedAccountIntegration.delete();
      toast.success(t("Mattermost connection removed"));
    }
  }, [linkedAccountIntegration]);

  React.useEffect(() => {
    void collections.fetchPage({
      limit: 100,
    });
    void integrations.fetchPage({
      service: IntegrationService.Mattermost,
      limit: 100,
    });
  }, [collections, integrations]);

  React.useEffect(() => {
    if (linkedAccountIntegration) {
      void channels.load();
    }
  }, [linkedAccountIntegration]);

  useUnmount(() => (channels.isForceLoaded = false));

  return (
    <Scene title="Mattermost" icon={<MattermostIcon />}>
      <Heading>Mattermost</Heading>

      <SettingRow
        name="link"
        label={t("Account")}
        description={
          <Trans>
            Link your {{ appName }} account to Mattermost to enable posting
            document updates, searching and previewing the documents you have
            access to, directly within chat.
          </Trans>
        }
      >
        <Flex align="flex-end" column>
          {linkedAccountIntegration ? (
            <ConnectedButton
              onClick={handleRemoveConnection}
              confirmationMessage={<DisconnectDialogMessage />}
            />
          ) : (
            <Button neutral onClick={handleAddConnection}>
              {t("Connect")}
            </Button>
          )}
        </Flex>
      </SettingRow>

      {can.update && linkedAccountIntegration && (
        <IntegrationWebhook
          service={IntegrationService.Mattermost}
          renderConnect={({ collection }: RenderConnectProps) => (
            <ConnectWebhookButton collection={collection} />
          )}
        />
      )}
    </Scene>
  );
};

export default observer(MatterMost);
