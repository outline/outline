import { useKBar } from "kbar";
import { observer } from "mobx-react";
import {
  EditIcon,
  SearchIcon,
  ShapesIcon,
  HomeIcon,
  SettingsIcon,
} from "outline-icons";
import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import Bubble from "~/components/Bubble";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import { inviteUser } from "~/actions/definitions/users";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import {
  homePath,
  draftsPath,
  templatesPath,
  settingsPath,
  searchPath,
} from "~/utils/routeHelpers";
import Sidebar from "./Sidebar";
import ArchiveLink from "./components/ArchiveLink";
import Collections from "./components/Collections";
import Section from "./components/Section";
import SidebarAction from "./components/SidebarAction";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";
import TeamButton from "./components/TeamButton";
import TrashLink from "./components/TrashLink";

function MainSidebar() {
  const { t } = useTranslation();
  const { ui, documents } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { query } = useKBar();
  const location = useLocation();
  const history = useHistory();
  const can = usePolicy(team.id);

  React.useEffect(() => {
    documents.fetchDrafts();
    documents.fetchTemplates();
  }, [documents]);

  const [dndArea, setDndArea] = React.useState();
  const handleSidebarRef = React.useCallback((node) => setDndArea(node), []);
  const html5Options = React.useMemo(
    () => ({
      rootElement: dndArea,
    }),
    [dndArea]
  );

  const handleSearch = React.useCallback(() => {
    const isSearching = location.pathname.startsWith(searchPath());
    if (isSearching) {
      history.push(searchPath());
    } else {
      ui.enableModKHint();
      query.toggle();
    }
  }, [ui, location, history, query]);

  return (
    <Sidebar ref={handleSidebarRef}>
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          <AccountMenu>
            {(props) => (
              <TeamButton
                {...props}
                subheading={user.name}
                teamName={team.name}
                logoUrl={team.avatarUrl}
                showDisclosure
              />
            )}
          </AccountMenu>
          <Scrollable flex topShadow>
            <Section>
              <SidebarLink
                to={homePath()}
                icon={<HomeIcon color="currentColor" />}
                exact={false}
                label={t("Home")}
              />
              <SidebarLink
                onClick={handleSearch}
                icon={<SearchIcon color="currentColor" />}
                label={t("Search")}
                exact={false}
              />
              {can.createDocument && (
                <SidebarLink
                  to={draftsPath()}
                  icon={<EditIcon color="currentColor" />}
                  label={
                    <Drafts align="center">
                      {t("Drafts")}
                      <Bubble count={documents.totalDrafts} />
                    </Drafts>
                  }
                />
              )}
            </Section>
            <Starred />
            <Section auto>
              <Collections />
            </Section>
            <Section>
              {can.createDocument && (
                <>
                  <SidebarLink
                    to={templatesPath()}
                    icon={<ShapesIcon color="currentColor" />}
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
              <SidebarLink
                to={settingsPath()}
                icon={<SettingsIcon color="currentColor" />}
                exact={false}
                label={t("Settings")}
              />
              <SidebarAction action={inviteUser} />
            </Section>
          </Scrollable>
        </DndProvider>
      )}
    </Sidebar>
  );
}

const Drafts = styled(Flex)`
  height: 24px;
`;

export default observer(MainSidebar);
