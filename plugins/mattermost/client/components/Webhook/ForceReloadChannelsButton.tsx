import { observer } from "mobx-react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Spinner from "~/components/Spinner";
import Text from "~/components/Text";
import { channels } from "../../utils/ChannelsStore";

const ForceReloadChannelsButton = () => {
  const { t } = useTranslation();

  const handleForceLoad = React.useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      await channels.load({ force: true });
      if (channels.isLoadError) {
        toast.error(t("Channels could not be loaded, please retry"));
      } else {
        toast.success(t("Channels loaded successfully"));
      }
    },
    [channels]
  );

  if (channels.isForceLoaded) {
    return null;
  }
  return (
    <Flex>
      <Text as="p" type="tertiary">
        <Trans>
          This data was loaded from cache.
          <Flex gap={4}>
            Click{" "}
            <RefreshCacheButton
              disabled={channels.isLoading}
              onClick={handleForceLoad}
            >
              here
            </RefreshCacheButton>{" "}
            to refresh.
            {channels.isLoading && <Spinner />}
          </Flex>
        </Trans>
      </Text>
    </Flex>
  );
};

const RefreshCacheButton = styled.a<{ disabled: boolean }>`
  color: ${({ theme }) => theme.accent};
  cursor: ${({ disabled }) => disabled && "default"};
  pointer-events: ${({ disabled }) => disabled && "none"};
`;

export default observer(ForceReloadChannelsButton);
