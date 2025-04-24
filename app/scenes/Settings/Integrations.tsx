// app/scenes/Settings/Integrations.tsx

import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";

import Heading from "~/components/Heading";

import IntegrationCard from "~/components/IntegrationCard";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useSettingsConfig from "~/hooks/useSettingsConfig";

export function Integrations() {
  const { t } = useTranslation();
  let items = useSettingsConfig();
  items = items.filter((item) => item.group === "Integrations" && item.enabled);
  return (
    <Scene title={t("Integrations")}>
      <Heading>{t("Integrations")}</Heading>
      <Text type="secondary">
        <Trans>Enable and configure third-party integrations.</Trans>
      </Text>

      <Grid>
        {items.map((item) => (
          <IntegrationCard key={item.path} integration={item} />
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
