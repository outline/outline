import groupBy from "lodash/groupBy";
import { observer } from "mobx-react";
import { BackIcon, SidebarIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { metaDisplay } from "@shared/utils/keyboard";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import ToggleButton from "./components/ToggleButton";
import Version from "./components/Version";

function SettingsSidebar() {
  const { ui } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const configs = useSettingsConfig();
  const groupedConfig = groupBy(configs, "group");

  const returnToApp = React.useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar>
      <HistoryNavigation />
      <SidebarButton
        title={t("Return to App")}
        image={<StyledBackIcon />}
        onClick={returnToApp}
      >
        <Tooltip content={t("Toggle sidebar")} shortcut={`${metaDisplay}+.`}>
          <ToggleButton
            position="bottom"
            image={<SidebarIcon />}
            onClick={() => {
              ui.toggleCollapsedSidebar();
              (document.activeElement as HTMLElement)?.blur();
            }}
          />
        </Tooltip>
      </SidebarButton>

      <Flex auto column>
        <Scrollable shadow>
          {Object.keys(groupedConfig).map((header) => (
            <Section key={header}>
              <Header title={header}>
                {groupedConfig[header].map((item) => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    active={
                      item.path !== settingsPath()
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
    </Sidebar>
  );
}

const StyledBackIcon = styled(BackIcon)`
  margin-left: 4px;
`;

export default observer(SettingsSidebar);
