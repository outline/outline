import { observer } from "mobx-react";
import { DraftsIcon, SearchIcon, HomeIcon, SidebarIcon } from "outline-icons";
import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import { inviteUser } from "~/actions/definitions/users";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import OrganizationMenu from "~/menus/OrganizationMenu";
import { metaDisplay } from "~/utils/keyboard";
import { homePath, draftsPath, searchPath } from "~/utils/routeHelpers";
import TeamLogo from "../TeamLogo";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import ArchiveLink from "./components/ArchiveLink";
import Collections from "./components/Collections";
import DragPlaceholder from "./components/DragPlaceholder";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SharedWithMe from "./components/SharedWithMe";
import SidebarAction from "./components/SidebarAction";
import SidebarButton, { SidebarButtonProps } from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";
import ToggleButton from "./components/ToggleButton";
import TrashLink from "./components/TrashLink";

function AppSidebar() {
  const { t } = useTranslation();
  const { documents, ui, collections } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);

  React.useEffect(() => {
    if (!user.isViewer) {
      void documents.fetchDrafts();
      void collections.fetchAll();
    }
  }, [documents, collections, user.isViewer]);

  const [dndArea, setDndArea] = React.useState();
  const handleSidebarRef = React.useCallback((node) => setDndArea(node), []);
  const html5Options = React.useMemo(
    () => ({
      rootElement: dndArea,
    }),
    [dndArea]
  );

  return (
    <Sidebar hidden={!ui.readyToShow} ref={handleSidebarRef}>
      <HistoryNavigation />
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          <DragPlaceholder />

          <OrganizationMenu>
            {(props: SidebarButtonProps) => (
              <SidebarButton
                {...props}
                title={team.name}
                image={
                  <TeamLogo
                    model={team}
                    size={24}
                    alt={t("Logo")}
                    style={{ marginLeft: 4 }}
                  />
                }
              >
                <Tooltip
                  content={t("Toggle sidebar")}
                  shortcut={`${metaDisplay}+.`}
                  delay={500}
                >
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
            )}
          </OrganizationMenu>
          <Scrollable flex shadow>
            <Section>
              <SidebarLink
                to={homePath()}
                icon={<HomeIcon />}
                exact={false}
                label={t("Home")}
              />
              <SidebarLink
                to={searchPath()}
                icon={<SearchIcon />}
                label={t("Search")}
                exact={false}
              />
              {can.createDocument && (
                <SidebarLink
                  to={draftsPath()}
                  icon={<DraftsIcon />}
                  label={
                    <Flex align="center" justify="space-between">
                      {t("Drafts")}
                      {documents.totalDrafts > 0 ? (
                        <Drafts size="xsmall" type="tertiary">
                          {documents.totalDrafts}
                        </Drafts>
                      ) : null}
                    </Flex>
                  }
                />
              )}
            </Section>
            <Section>
              <SharedWithMe />
            </Section>
            <Section>
              <Starred />
            </Section>
            <Section auto>
              <Collections />
            </Section>
            <Section>
              {can.createDocument && (
                <>
                  <ArchiveLink />
                  <TrashLink />
                </>
              )}
              <SidebarAction action={inviteUser} />
            </Section>
          </Scrollable>
        </DndProvider>
      )}
    </Sidebar>
  );
}

const Drafts = styled(Text)`
  margin: 0 4px;
`;

export default observer(AppSidebar);
