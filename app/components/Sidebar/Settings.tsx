import groupBy from "lodash/groupBy";
import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import Desktop from "~/utils/Desktop";
import isCloudHosted from "~/utils/isCloudHosted";
import Sidebar from "./Sidebar";
import FullWidthButton from "./components/FullWidthButton";
import Header from "./components/Header";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SidebarLink from "./components/SidebarLink";
import Version from "./components/Version";

function SettingsSidebar() {
  const { t } = useTranslation();
  const history = useHistory();
  const configs = useSettingsConfig();
  const groupedConfig = groupBy(configs, "group");

  const returnToApp = React.useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar>
      <HistoryNavigation />
      <FullWidthButton
        title={t("Return to App")}
        image={<StyledBackIcon />}
        onClick={returnToApp}
        minHeight={Desktop.hasInsetTitlebar() ? undefined : 48}
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
