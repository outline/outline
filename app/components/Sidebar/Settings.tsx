import { groupBy, sortBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { BackIcon, PadlockIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { Plan } from "@shared/types";
import type { PlanFeature } from "@shared/types";
import { s } from "@shared/styles";
import { PlanHelper } from "@shared/utils/PlanHelper";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import Tooltip from "~/components/Tooltip";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import { useLocationSelector } from "~/hooks/useLocationSelector";
import { usePlanName } from "~/hooks/usePlanName";
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
  const pathname = useLocationSelector((location) => location.pathname);
  const configs = useSettingsConfig();

  const groupedConfig = groupBy(
    // Locked upsell items sort to the end of their group.
    sortBy(
      configs.filter((item) =>
        item.group === t("Integrations") && item.pluginId && !item.locked
          ? integrations.findByService(item.pluginId)
          : true
      ),
      (item) => (item.locked ? 1 : 0)
    ),
    "group"
  );

  const returnToApp = useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar canCollapse={false}>
      <SidebarButton
        title={t("Back to app")}
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
                        ? pathname.startsWith(item.path)
                        : undefined
                    }
                    icon={<item.icon />}
                    label={
                      item.locked && item.entitlement ? (
                        <UpsellLabel
                          name={item.name}
                          feature={item.entitlement}
                        />
                      ) : (
                        item.name
                      )
                    }
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

interface UpsellLabelProps {
  /** The name of the settings page. */
  name: string;
  /** The plan feature that the page advertises. */
  feature: PlanFeature;
}

function UpsellLabel({ name, feature }: UpsellLabelProps) {
  const { t } = useTranslation();
  const plan = PlanHelper.getMinimumPlan(feature) ?? Plan.Enterprise;
  const planName = usePlanName(plan);
  const description = t("Available on {{ planName }}", { planName });

  return (
    <UpsellLabelWrapper>
      {name}
      <Tooltip content={description}>
        <Lock role="img" aria-label={description}>
          <PadlockIcon size={16} />
        </Lock>
      </Tooltip>
    </UpsellLabelWrapper>
  );
}

const UpsellLabelWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Lock = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${s("textTertiary")};
  opacity: 0.5;
`;

const StyledBackIcon = styled(BackIcon)`
  margin-inline-start: 4px;

  [dir="rtl"] & {
    transform: rotate(180deg);
  }
`;

export default observer(SettingsSidebar);
