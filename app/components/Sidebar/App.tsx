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
import styled from "styled-components";
import Bubble from "~/components/Bubble";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import { inviteUser } from "~/actions/definitions/users";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import {
  homePath,
  searchUrl,
  draftsPath,
  templatesPath,
  settingsPath,
} from "~/utils/routeHelpers";
import Avatar from "../Avatar";
import TeamLogo from "../TeamLogo";
import Sidebar from "./Sidebar";
import ArchiveLink from "./components/ArchiveLink";
import Collections from "./components/Collections";
import Section from "./components/Section";
import SidebarAction from "./components/SidebarAction";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";
import TrashLink from "./components/TrashLink";

function AppSidebar() {
  const { t } = useTranslation();
  const { policies, documents } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();

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
  const can = policies.abilities(team.id);

  return (
    <Sidebar ref={handleSidebarRef}>
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          <AccountMenu>
            {(props) => (
              <SidebarButton
                {...props}
                title={team.name}
                image={<TeamLogo src={team.avatarUrl} width={24} height={24} />}
                showDisclosure
              />
            )}
          </AccountMenu>
          <Scrollable flex shadow>
            <Section>
              <SidebarLink
                to={homePath()}
                icon={<HomeIcon color="currentColor" />}
                exact={false}
                label={t("Home")}
              />
              <SidebarLink
                to={{
                  pathname: searchUrl(),
                  state: {
                    fromMenu: true,
                  },
                }}
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
              <SidebarAction action={inviteUser} />
            </Section>
          </Scrollable>
          <AccountMenu>
            {(props) => (
              <SidebarButton
                {...props}
                title={user.name}
                image={<Avatar src={user.avatarUrl} size={24} />}
              />
            )}
          </AccountMenu>
        </DndProvider>
      )}
    </Sidebar>
  );
}

const Drafts = styled(Flex)`
  height: 24px;
`;

export default observer(AppSidebar);
