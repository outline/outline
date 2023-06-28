import { observer } from "mobx-react";
import { EditIcon, SearchIcon, ShapesIcon, HomeIcon } from "outline-icons";
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
import Desktop from "~/utils/Desktop";
import {
  homePath,
  draftsPath,
  templatesPath,
  searchPath,
} from "~/utils/routeHelpers";
import TeamLogo from "../TeamLogo";
import Sidebar from "./Sidebar";
import ArchiveLink from "./components/ArchiveLink";
import Collections from "./components/Collections";
import DragPlaceholder from "./components/DragPlaceholder";
import HeaderButton, { HeaderButtonProps } from "./components/HeaderButton";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SidebarAction from "./components/SidebarAction";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";
import TrashLink from "./components/TrashLink";

function AppSidebar() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);

  React.useEffect(() => {
    if (!user.isViewer) {
      void documents.fetchDrafts();
      void documents.fetchTemplates();
    }
  }, [documents, user.isViewer]);

  const [dndArea, setDndArea] = React.useState();
  const handleSidebarRef = React.useCallback((node) => setDndArea(node), []);
  const html5Options = React.useMemo(
    () => ({
      rootElement: dndArea,
    }),
    [dndArea]
  );

  return (
    <Sidebar ref={handleSidebarRef}>
      <HistoryNavigation />
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          <DragPlaceholder />

          <OrganizationMenu>
            {(props: HeaderButtonProps) => (
              <HeaderButton
                {...props}
                title={team.name}
                image={
                  <TeamLogo
                    model={team}
                    size={Desktop.hasInsetTitlebar() ? 24 : 32}
                    alt={t("Logo")}
                  />
                }
                style={
                  // Move the logo over to align with smaller size
                  Desktop.hasInsetTitlebar() ? { paddingLeft: 8 } : undefined
                }
                showDisclosure
              />
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
                  icon={<EditIcon />}
                  label={
                    <Flex align="center" justify="space-between">
                      {t("Drafts")}
                      <Drafts size="xsmall" type="tertiary">
                        {documents.totalDrafts}
                      </Drafts>
                    </Flex>
                  }
                />
              )}
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
                  <SidebarLink
                    to={templatesPath()}
                    icon={<ShapesIcon />}
                    exact={false}
                    label={t("Templates")}
                    active={
                      documents.active
                        ? documents.active.isTemplate &&
                          !documents.active.isDeleted &&
                          !documents.active.isArchived
                        : undefined
                    }
                  />
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
