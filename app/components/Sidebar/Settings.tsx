import { groupBy } from "lodash";
import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useAuthorizedSettingsConfig from "~/hooks/useAuthorizedSettingsConfig";
import isCloudHosted from "~/utils/isCloudHosted";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Version from "./components/Version";

function SettingsSidebar() {
  const { t } = useTranslation();
  const history = useHistory();
  const configs = useAuthorizedSettingsConfig();
  const groupedConfig = groupBy(configs, "group");

  const returnToApp = React.useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar>
      <SidebarButton
        title={t("Return to App")}
        image={<StyledBackIcon color="currentColor" />}
        onClick={returnToApp}
        minHeight={48}
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
                    icon={<item.icon color="currentColor" />}
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
