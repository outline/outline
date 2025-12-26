import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Scene from "~/components/Scene";
import RevisionViewer from "~/scenes/Document/components/RevisionViewer";
import stores from "~/stores";
import { examples } from "./components/ExampleData";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import Scrollable from "~/components/Scrollable";
import Switch from "~/components/Switch";
import { action } from "mobx";

/**
 * Changesets scene for developer playground.
 * Provides a way to test and visualize different ProseMirror diff scenarios.
 */
function Changesets() {
  const { ui } = useStores();
  const history = useHistory();
  const query = useQuery();
  const [showChangeset, setShowChangeset] = React.useState(false);
  const id = query.get("id");
  const selectedExample = examples.find((e) => e.id === id) ?? examples[0];

  /**
   * We use a side effect to sync the mock models in the store when the example changes.
   * This ensures that MobX reactions in RevisionViewer and the model computed properties
   * (like `changeset`) are triggered correctly.
   */
  React.useEffect(
    action(() => {
      stores.revisions.data.clear();

      stores.documents.add({
        id: "mock-document-id",
        title: selectedExample.name,
        urlId: "mock-document-id",
        createdAt: "2024-01-01T12:00:00.000Z",
        updatedAt: "2024-01-02T12:00:00.000Z",
        data: selectedExample.after,
      });

      // Revisions are sorted by createdAt desc in the store.
      // The "before" version must be older than the "after" version.
      stores.revisions.add({
        id: "mock-before-" + id,
        documentId: "mock-document-id",
        title: selectedExample.name,
        createdAt: "2024-01-01T12:00:00.000Z",
        data: selectedExample.before,
      });

      stores.revisions.add({
        id: "mock-after-" + id,
        documentId: "mock-document-id",
        title: selectedExample.name,
        createdAt: "2024-01-02T12:00:00.000Z",
        data: selectedExample.after,
      });
    }),
    [selectedExample]
  );

  const mockDocument = stores.documents.get("mock-document-id");
  const mockRevision = stores.revisions.get("mock-after-" + id);

  return (
    <Scene title="Changeset Playground" centered>
      <Sidebar style={{ left: ui.sidebarWidth + 8 }} column>
        <Flex style={{ padding: "0 8px 12px" }}>
          <Switch
            label="Show JSON"
            checked={showChangeset}
            onChange={(checked) => setShowChangeset(checked)}
          />
        </Flex>
        <Scrollable>
          {examples.map((example) => (
            <ExampleItem
              key={example.id}
              title={example.name}
              onClick={() =>
                history.replace({
                  search: `?id=${example.id}`,
                })
              }
              $active={selectedExample.id === example.id}
              border={false}
            />
          ))}
        </Scrollable>
      </Sidebar>
      <Content auto column>
        {mockDocument && mockRevision ? (
          <>
            <RevisionViewer
              key={mockRevision.id} // Force remount on example change
              document={mockDocument}
              revision={mockRevision}
              id={mockRevision.id}
              showChanges={true}
            />
            {showChangeset && (
              <Pre>
                {JSON.stringify(mockRevision.changeset?.changes, null, 2)}
              </Pre>
            )}
          </>
        ) : null}
      </Content>
    </Scene>
  );
}

const Sidebar = styled(Flex)`
  position: absolute;
  top: 110px;
  bottom: 0;
  width: 250px;
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

const Pre = styled.pre`
  background: ${(props) => props.theme.codeBackground};
  color: ${(props) => props.theme.code};
  padding: 16px;
  margin: 16px 0;
  border-radius: 4px;
  font-size: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

export default observer(Changesets);
