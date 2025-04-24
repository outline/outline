// app/scenes/Settings/Integrations.tsx

import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";

import Heading from "~/components/Heading";

import IntegrationCard from "~/components/IntegrationCard";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useSettingsConfig from "~/hooks/useSettingsConfig";

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<React.ComponentProps<typeof Icon>>; // not used directly here
  component: React.ComponentType;
  enabled: boolean;
  group: string;
  isActive?: boolean;
};

// six dummy integrations

export function Integrations() {
  const { t } = useTranslation();
  // const history = useHistory();
  let items = useSettingsConfig();
  items = items.filter((item) => item.group === "Integrations" && item.enabled);
  return (
    <Scene title={t("Integrations")}>
      <Heading>{t("Integrations")}</Heading>
      <Text type="secondary">
        <Trans>
          Enable and configure third-party integrations to extend Outline’s
          functionality.
        </Trans>
      </Text>

      <Grid>
        {items.map((item) => (
          <IntegrationCard
            key={item.path}
            integration={{
              id: item.path,
              name: item.name,
              icon: item.icon, // IntegrationCard will fallback to puzzle if unknown
              description: t("Connect your {{ name }} account", {
                name: item.name,
              }),
              isActive: !!item.isActive,
            }}
          />
        ))}
      </Grid>
    </Scene>
  );
}

const Grid = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill);
  gap: 20px;
`;
