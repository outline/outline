import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Scene from "~/components/Scene";
import RevisionViewer from "~/scenes/Document/components/RevisionViewer";
import stores from "~/stores";
import { examples } from "./components/ExampleData";
import useStores from "~/hooks/useStores";
import Scrollable from "~/components/Scrollable";

/**
 * Changesets scene for developer playground.
 * Provides a way to test and visualize different ProseMirror diff scenarios.
 */
function Changesets() {
  const { ui } = useStores();
  const [selectedExampleId, setSelectedExampleId] = React.useState(
    examples[0].id
  );

  const selectedExample =
    examples.find((e) => e.id === selectedExampleId) ?? examples[0];

  /**
   * We use a side effect to sync the mock models in the store when the example changes.
   * This ensures that MobX reactions in RevisionViewer and the model computed properties
   * (like `changeset`) are triggered correctly.
   */
  // React.useEffect(() => {
  // Clear previous mock revisions to ensure clean state
  stores.revisions.removeAll({ documentId: "mock-document-id" });

  stores.documents.add({
    id: "mock-document-id",
    title: selectedExample.name,
    urlId: "mock-document-id",
    createdAt: "2024-01-01T12:00:00.000Z",
    updatedAt: "2024-01-02T12:00:00.000Z",
  });

  // Revisions are sorted by createdAt desc in the store.
  // The "before" version must be older than the "after" version.
  stores.revisions.add({
    id: "mock-revision-before",
    documentId: "mock-document-id",
    title: selectedExample.name,
    createdAt: "2024-01-01T12:00:00.000Z",
    data: selectedExample.before,
  });

  stores.revisions.add({
    id: "mock-revision-after",
    documentId: "mock-document-id",
    title: selectedExample.name,
    createdAt: "2024-01-02T12:00:00.000Z",
    data: selectedExample.after,
  });
  //}, [selectedExample]);

  const mockDocument = stores.documents.get("mock-document-id");
  const mockRevision = stores.revisions.get("mock-revision-after");

  return (
    <Scene title="Changeset Playground" centered>
      <Sidebar style={{ left: ui.sidebarWidth + 8 }} column>
        <Scrollable>
          {examples.map((example) => (
            <ExampleItem
              key={example.id}
              title={example.name}
              onClick={() => setSelectedExampleId(example.id)}
              $active={selectedExampleId === example.id}
              border={false}
            />
          ))}
        </Scrollable>
      </Sidebar>
      <Content auto column>
        {mockDocument && mockRevision ? (
          <RevisionViewer
            key={selectedExampleId} // Force remount on example change
            document={mockDocument}
            revision={mockRevision}
            id={mockRevision.id}
            showChanges={true}
          />
        ) : null}
      </Content>
    </Scene>
  );
}

const Sidebar = styled(Flex)`
  position: absolute;
  top: 110px;
`;

const ExampleItem = styled(ListItem)<{ $active: boolean }>`
  padding: 4px 8px;
  min-height: 0;
  margin: 1px 0 0 0;
  border-radius: 4px;
  background: ${(props) =>
    props.$active ? props.theme.sidebarActiveBackground : "transparent"};
`;

const Content = styled(Flex)`
  overflow-y: auto;
  background: ${(props) => props.theme.background};
`;

export default observer(Changesets);
