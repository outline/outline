import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Scrollable from "~/components/Scrollable";
import SearchPopover from "~/components/SearchPopover";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import Sidebar from "./Sidebar";
import Section from "./components/Section";
import DocumentLink from "./components/SharedDocumentLink";

type Props = {
  rootNode: NavigationNode;
  shareId: string;
};

function SharedSidebar({ rootNode, shareId }: Props) {
  const { ui, documents } = useStores();

  return (
    <Sidebar>
      <ScrollContainer flex>
        <TopSection>
          <SearchPopover />
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
  margin-bottom: 20px;
`;

export default observer(SharedSidebar);
