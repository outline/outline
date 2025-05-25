import groupBy from "lodash/groupBy";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import IntegrationCard from "./components/IntegrationCard";
import { StickyFilters } from "./components/StickyFilters";

export function Integrations() {
  const { t } = useTranslation();
  const { integrations } = useStores();
  const items = useSettingsConfig();
  const [query, setQuery] = React.useState("");

  const handleQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const groupedItems = groupBy(
    items.filter(
      (item) =>
        item.group === "Integrations" &&
        item.enabled &&
        item.path !== settingsPath("integrations") &&
        item.name.toLowerCase().includes(query.toLowerCase())
    ),
    (item) =>
      item.pluginId && integrations.findByService(item.pluginId)
        ? "connected"
        : "available"
  );

  return (
    <Scene title={t("Integrations")}>
      <Heading>{t("Integrations")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Configure a variety of integrations with third-party services.
        </Trans>
      </Text>
      <StickyFilters gap={8}>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleQuery}
        />
      </StickyFilters>

      <Cards gap={30} wrap>
        {groupedItems.connected?.map((item) => (
          <IntegrationCard key={item.path} integration={item} isConnected />
        ))}
        {groupedItems.available?.map((item) => (
          <IntegrationCard key={item.path} integration={item} />
        ))}
      </Cards>
    </Scene>
  );
}

const Cards = styled(Flex)`
  margin-top: 20px;
  width: "100%";
`;
