import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import { settingsPath } from "~/utils/routeHelpers";
import IntegrationCard from "./components/IntegrationCard";
import { StickyFilters } from "./components/StickyFilters";

export function Integrations() {
  const { t } = useTranslation();
  let items = useSettingsConfig();
  const [query, setQuery] = React.useState("");

  const handleQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  items = items
    .filter(
      (item) =>
        item.group === "Integrations" &&
        item.enabled &&
        item.path !== settingsPath("integrations") &&
        item.name.toLowerCase().includes(query.toLowerCase())
    )
    .sort((item) => (item.isActive ? -1 : 1));

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

      <CardsFlex gap={30} wrap>
        {items.map((item) => (
          <IntegrationCard key={item.path} integration={item} />
        ))}
      </CardsFlex>
    </Scene>
  );
}

const CardsFlex = styled(Flex)`
  margin-top: 20px;
  width: "100%";
`;
