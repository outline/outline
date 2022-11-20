import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Team from "~/models/Team";
import Scrollable from "~/components/Scrollable";
import SearchPopover from "~/components/SearchPopover";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import history from "~/utils/history";
import TeamLogo from "../TeamLogo";
import Sidebar from "./Sidebar";
import Section from "./components/Section";
import DocumentLink from "./components/SharedDocumentLink";
import SidebarButton from "./components/SidebarButton";

type Props = {
  team?: Team;
  rootNode: NavigationNode;
  shareId: string;
};

function SharedSidebar({ rootNode, team, shareId }: Props) {
  const { ui, documents } = useStores();

  return (
    <Sidebar>
      <ScrollContainer flex>
        {team && (
          <SidebarButton
            title={team.name}
            image={<TeamLogo model={team} size={32} alt={team.name} />}
            onClick={() => history.push(team.url)}
          />
        )}
        <TopSection>
          <SearchPopover shareId={shareId} />
        </TopSection>
        <Section>
          <DocumentLink
            index={0}
            shareId={shareId}
            depth={1}
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
