import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { NavigationNode } from "@shared/types";
import Scrollable from "~/components/Scrollable";
import SearchPopover from "~/components/SearchPopover";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { homePath, sharedDocumentPath } from "~/utils/routeHelpers";
import { useTeamContext } from "../TeamContext";
import TeamLogo from "../TeamLogo";
import Sidebar from "./Sidebar";
import Section from "./components/Section";
import DocumentLink from "./components/SharedDocumentLink";
import SidebarButton from "./components/SidebarButton";

type Props = {
  rootNode: NavigationNode;
  shareId: string;
};

function SharedSidebar({ rootNode, shareId }: Props) {
  const team = useTeamContext();
  const { ui, documents, auth } = useStores();
  const { t } = useTranslation();

  return (
    <Sidebar>
      {team && (
        <SidebarButton
          title={team.name}
          image={<TeamLogo model={team} size={32} alt={t("Logo")} />}
          onClick={() =>
            history.push(
              auth.user ? homePath() : sharedDocumentPath(shareId, rootNode.url)
            )
          }
        />
      )}
      <ScrollContainer topShadow flex>
        <TopSection>
          <SearchPopover shareId={shareId} />
        </TopSection>
        <Section>
          <DocumentLink
            index={0}
            depth={0}
            shareId={shareId}
            node={rootNode}
            activeDocumentId={ui.activeDocumentId}
            activeDocument={documents.active}
          />
        </Section>
      </ScrollContainer>
    </Sidebar>
  );
}

const ScrollContainer = styled(Scrollable)`
  padding-bottom: 16px;
`;

const TopSection = styled(Section)`
  // this weird looking && increases the specificity of the style rule
  &&:first-child {
    margin-top: 16px;
  }

  && {
    margin-bottom: 16px;
  }
`;

export default observer(SharedSidebar);
