import { groupBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Version from "./components/Version";

function SettingsSidebar() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const configs = useSettingsConfig();

  const groupedConfig = groupBy(
    configs.filter((item) =>
      item.group === t("Integrations") && item.pluginId
        ? integrations.findByService(item.pluginId)
        : true
    ),
    "group"
  );

  const returnToApp = useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar canCollapse={false}>
      <SidebarButton
        title={t("Return to App")}
        image={<StyledBackIcon />}
        onClick={returnToApp}
      />

      <Flex auto column>
        <Scrollable shadow>
          {Object.keys(groupedConfig).map((header) => (
            <Section key={header}>
              <Header title={header}>
                {groupedConfig[header].map((item) => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    onClickIntent={item.preload}
                    active={
                      item.path.startsWith(settingsPath("templates")) ||
                      item.path.startsWith(settingsPath("groups"))
                        ? location.pathname.startsWith(item.path)
                        : undefined
                    }
                    icon={<item.icon />}
                    label={item.name}
                  />
                ))}
              </Header>
            </Section>
          ))}
          {!isCloudHosted && (
            <Section>
              <Header title={t("Installation")} />
              <Version />
            </Section>
          )}
        </Scrollable>
      </Flex>
      <HistoryNavigation />
    </Sidebar>
  );
}

const StyledBackIcon = styled(BackIcon)`
  margin-inline-start: 4px;

  [dir="rtl"] & {
    transform: rotate(180deg);
  }
`;

export default observer(SettingsSidebar);
