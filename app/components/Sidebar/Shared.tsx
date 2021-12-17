import { observer } from "mobx-react";
import {
  EditIcon,
  SearchIcon,
  ShapesIcon,
  HomeIcon,
  SettingsIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "~/models/Document";
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
import Sidebar from "./Sidebar";
import Section from "./components/Section";
import DocumentLink from "./components/SharedDocumentLink";
import SidebarAction from "./components/SidebarAction";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";

type Props = {
  document: Document;
};

function MainSidebar({ document }: Props) {
  const { t } = useTranslation();
  const { policies, documents } = useStores();
  const team = useCurrentTeam();

  React.useEffect(() => {
    documents.fetchDrafts();
    documents.fetchTemplates();
  }, [documents]);

  const [dndArea, setDndArea] = React.useState();
  const handleSidebarRef = React.useCallback((node) => setDndArea(node), []);

  const can = policies.abilities(team.id);

  return (
    <Sidebar ref={handleSidebarRef}>
      {dndArea && (
        <>
          <Scrollable flex topShadow>
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
            </Section>
            <Starred />
            <Section>
              <SidebarLink
                to={settingsPath()}
                icon={<SettingsIcon color="currentColor" />}
                exact={false}
                label={t("Settings")}
              />
              <SidebarAction action={inviteUser} />

              <DocumentLink node={document} />
            </Section>
          </Scrollable>
        </>
      )}
    </Sidebar>
  );
}

const Drafts = styled(Flex)`
  height: 24px;
`;

export default observer(MainSidebar);
