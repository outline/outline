// app/scenes/Settings/Integrations.tsx

import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import Flex from "@shared/components/Flex";

import Heading from "~/components/Heading";

import IntegrationCard from "~/components/IntegrationCard";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useSettingsConfig from "~/hooks/useSettingsConfig";

export function Integrations() {
  const { t } = useTranslation();
  let items = useSettingsConfig();

  items = items.filter(
    (item) =>
      item.group === "Integrations" &&
      item.enabled &&
      item.name !== t("All Integrations")
  );

  return (
    <Scene title={t("Integrations")}>
      <Heading>{t("Integrations")}</Heading>
      <Text type="secondary">
        <Trans>
          Enable and configure your favorite third-party integrations with
          Outline.
        </Trans>
      </Text>

      <Flex column gap={30} style={{ marginTop: 20 }}>
        {items.map((item) => (
          <IntegrationCard key={item.path} integration={item} />
        ))}
      </Flex>
    </Scene>
  );
}
