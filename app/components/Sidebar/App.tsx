import { observer } from "mobx-react";
import { SidebarIcon } from "outline-icons";
import { useEffect, useState, useRef } from "react";
import {
  DragActiveProvider,
  SidebarScrollProvider,
} from "./components/DragActiveContext";
import { useTranslation } from "react-i18next";
import { metaDisplay } from "@shared/utils/keyboard";
import Scrollable from "~/components/Scrollable";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import TeamMenu from "~/menus/TeamMenu";
import TeamLogo from "../TeamLogo";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import DragPlaceholder from "./components/DragPlaceholder";
import HistoryNavigation from "./components/HistoryNavigation";
import { ShopLinks } from "./components/ShopLinks";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import ToggleButton from "./components/ToggleButton";
import useMobile from "~/hooks/useMobile";
function AppSidebar() {
  const { t } = useTranslation();
  const { ui } = useStores();
  const team = useCurrentTeam();
  const isMobile = useMobile();
  // Scrollable reads ref.current internally for its shadow/ResizeObserver
  // logic, so we must pass an object ref — a callback ref would leave those
  // reads undefined. We mirror the attached node into state so the
  // SidebarScrollProvider can re-render descendants with the scroll element.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setScrollArea(scrollRef.current);
  }, []);
  return (
    <Sidebar hidden={!ui.readyToShow}>
      <DragActiveProvider>
        <DragPlaceholder />

        <TeamMenu>
          <SidebarButton
            title={team.name}
            image={<TeamLogo model={team} size={24} alt={t("Logo")} />}
          >
            {isMobile ? null : (
              <Tooltip
                content={t("Toggle sidebar")}
                shortcut={`${metaDisplay}+.`}
              >
                <ToggleButton
                  position="bottom"
                  image={<SidebarIcon />}
                  aria-label={
                    ui.sidebarCollapsed
                      ? t("Expand sidebar")
                      : t("Collapse sidebar")
                  }
                  style={{ paddingInline: 4 }}
                  onClick={() => {
                    ui.toggleCollapsedSidebar();
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                />
              </Tooltip>
            )}
          </SidebarButton>
        </TeamMenu>
        <Scrollable flex shadow ref={scrollRef}>
          <SidebarScrollProvider value={scrollArea}>
            <Section>
              <ShopLinks />
            </Section>
          </SidebarScrollProvider>
        </Scrollable>
      </DragActiveProvider>
      <HistoryNavigation />
    </Sidebar>
  );
}
export default observer(AppSidebar);
