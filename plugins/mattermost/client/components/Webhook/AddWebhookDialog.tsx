import invariant from "invariant";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { HashtagIcon, PadlockIcon } from "outline-icons";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputSelect, { Option } from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { Channel, ChannelType } from "../../../shared/types";
import { channels } from "../../utils/ChannelsStore";
import ForceReloadChannels from "./ForceReloadChannels";

type Props = {
  collection: Collection;
  onSave: () => void;
};

const AddWebhookDialog = ({ collection, onSave }: Props) => {
  const { t } = useTranslation();
  const { integrations } = useStores();
  const [selectedChannel, setSelectedChannel] = React.useState<
    Channel | undefined
  >(channels.data.length ? channels.data[0] : undefined);
  const [saving, setSaving] = React.useState(false);

  const options: Option[] = React.useMemo(
    () =>
      channels.data.map((channel) => ({
        label: (
          <Flex align="center" gap={4}>
            {channel.type === ChannelType.Public ? (
              <HashtagIcon size={18} />
            ) : (
              <PadlockIcon size={18} />
            )}
            {channel.name}
          </Flex>
        ),
        value: channel.id,
      })),
    [channels.data]
  );

  const handleSelectChannel = React.useCallback(
    (channelId: string) => {
      const channel = channels.data.find((ch) => ch.id === channelId);
      if (channel) {
        setSelectedChannel(channel);
      }
    },
    [channels]
  );

  const handleSave = React.useCallback(async () => {
    try {
      setSaving(true);

      const res = await client.post("/mattermost.webhook", {
        collectionId: collection.id,
        channel: selectedChannel,
      });
      runInAction(`create#${integrations.modelName}`, () => {
        invariant(res?.data, "Data should be available");
        integrations.add(res.data);
        integrations.addPolicies(res.policies);
      });

      toast.success(t("Mattermost webhook setup successful"));
      onSave();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [selectedChannel, integrations]);

  React.useEffect(() => {
    if (!selectedChannel && channels.data.length) {
      setSelectedChannel(channels.data[0]);
    }
  }, [selectedChannel, channels]);

  if (options.length === 0) {
    return (
      <Flex column>
        <Text as="p" type="secondary">
          <Trans>No channels available for the connected team.</Trans>
        </Text>
        <ForceReloadChannels />
      </Flex>
    );
  }

  return (
    <div>
      <Text as="p" type="secondary">
        <Trans>Select the channel where the updates need to be posted.</Trans>
      </Text>
      <InputSelect
        value={selectedChannel?.id}
        options={options}
        onChange={handleSelectChannel}
        disabled={channels.isLoading}
        ariaLabel={t("Channel")}
        label={t("Channel")}
      />
      <ForceReloadChannels />
      <Flex justify="end">
        <Button onClick={handleSave} disabled={saving || channels.isLoading}>
          {saving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </div>
  );
};

export default observer(AddWebhookDialog);
