import { observer } from "mobx-react";
import * as React from "react";
import Scrollable from "~/components/Scrollable";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import Sidebar from "./Sidebar";
import Section from "./components/Section";
import DocumentLink from "./components/SharedDocumentLink";

type Props = {
  rootNode: NavigationNode;
  shareId: string;
};

function MainSidebar({ rootNode, shareId }: Props) {
  const { documents } = useStores();

  return (
    <Sidebar>
      <Scrollable flex topShadow>
        <Section>
          <DocumentLink
            shareId={shareId}
            depth={1}
            node={rootNode}
            activeDocument={documents.active}
          />
        </Section>
      </Scrollable>
    </Sidebar>
  );
}

export default observer(MainSidebar);
