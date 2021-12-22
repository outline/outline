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
import { NavigationNode } from "~/types";
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
  rootNode: NavigationNode;
  shareId: string;
};

function MainSidebar({ rootNode, shareId }: Props) {
  const { documents } = useStores();

  React.useEffect(() => {
    documents.fetchDrafts();
    documents.fetchTemplates();
  }, [documents]);
  console.log({ shareId });

  return (
    <Sidebar>
      <Scrollable flex topShadow>
        <Section>
          <DocumentLink
            shareId={shareId}
            depth={1}
            node={rootNode}
            activeDocument={documents.active}
            prefetchDocument={documents.prefetchDocument}
          />
        </Section>
      </Scrollable>
    </Sidebar>
  );
}

export default observer(MainSidebar);
