import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import ListItem from "~/components/List/Item";
import Scene from "~/components/Scene";
import RevisionViewer from "~/scenes/Document/components/RevisionViewer";
import stores from "~/stores";
import { examples } from "./components/ExampleData";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import usePersistedState from "~/hooks/usePersistedState";
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
  const [showChangeset, setShowChangeset] = usePersistedState<boolean>(
    "show-changeset-json",
    false
  );
  const [showBeforeAfterDocs, setShowBeforeAfterDocs] =
    usePersistedState<boolean>("show-before-after-docs", false);
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
      stores.documents.data.clear();

      // Mock the main document (after state)
      stores.documents.add({
        id: "mock-document-id",
        title: selectedExample.name,
        urlId: "mock-document-id",
        createdAt: "2024-01-01T12:00:00.000Z",
        updatedAt: "2024-01-02T12:00:00.000Z",
        data: selectedExample.after,
      });

      // Mock the "before" revision
      stores.revisions.add({
        id: "mock-before-revision-" + id,
        documentId: "mock-document-id",
        title: "Before",
        createdAt: "2024-01-01T12:00:00.000Z",
        data: selectedExample.before,
      });

      // Mock the "after" revision
      stores.revisions.add({
        id: "mock-after-revision-" + id,
        documentId: "mock-document-id",
        title: "After",
        createdAt: "2024-01-02T12:00:00.000Z",
        data: selectedExample.after,
      });

      // Mock the revision that will be used for diffing
      // Revisions are sorted by createdAt desc in the store.
      // The "before" version must be older than the "after" version.
      stores.revisions.add({
        id: "mock-diff-revision-" + id,
        documentId: "mock-document-id",
        title: selectedExample.name,
        createdAt: "2024-01-02T12:00:00.000Z",
        data: selectedExample.after,
      });
    }),
    [selectedExample, id]
  );

  const mockDocument = stores.documents.get("mock-document-id");
  const mockDiffRevision = stores.revisions.get("mock-diff-revision-" + id);
  const mockBeforeRevision = stores.revisions.get("mock-before-revision-" + id);
  const mockAfterRevision = stores.revisions.get("mock-after-revision-" + id);

  return (
    <Scene title="Changeset Playground" centered>
      <Sidebar
        style={{ left: (ui.sidebarCollapsed ? 16 : ui.sidebarWidth) + 8 }}
        column
      >
        <Flex style={{ padding: "0 8px 32px" }} shrink={false} column>
          <Switch
            label="Show JSON"
            checked={showChangeset}
            onChange={(checked) => setShowChangeset(checked)}
            labelPosition="right"
          />
          <Switch
            label="Show Before/After Docs"
            checked={showBeforeAfterDocs}
            onChange={(checked) => setShowBeforeAfterDocs(checked)}
            labelPosition="right"
          />
        </Flex>
        <Scrollable>
          {examples.map((example) => (
            <ExampleItem
              key={example.id}
              title={example.name}
              onClick={() =>
                history.push({
                  search: `?id=${example.id}`,
                })
              }
              $active={selectedExample.id === example.id}
              border={false}
            />
          ))}
        </Scrollable>
      </Sidebar>
      <Flex auto column>
        {mockDocument && mockDiffRevision ? (
          <>
            <RevisionViewer
              key={mockDiffRevision.id} // Force remount on example change
              document={mockDocument}
              revision={mockDiffRevision}
              id={mockDiffRevision.id}
              showChanges={true}
            />
            {showBeforeAfterDocs && mockBeforeRevision && mockAfterRevision && (
              <>
                <RevisionViewer
                  document={mockDocument}
                  revision={mockBeforeRevision}
                  id={mockBeforeRevision.id}
                  showChanges={false}
                />
                <RevisionViewer
                  document={mockDocument}
                  revision={mockAfterRevision}
                  id={mockAfterRevision.id}
                  showChanges={false}
                />
              </>
            )}
            {showChangeset && (
              <>
                <Heading>Changeset</Heading>
                <Pre>
                  {JSON.stringify(mockDiffRevision.changeset?.changes, null, 2)}
                </Pre>
              </>
            )}
          </>
        ) : null}
      </Flex>
    </Scene>
  );
}

const Sidebar = styled(Flex)`
  position: absolute;
  top: 110px;
  bottom: 0;
`;

const ExampleItem = styled(ListItem)<{ $active: boolean }>`
  padding: 4px 8px;
  min-height: 0;
  margin: 1px 0 0 0;
  border-radius: 4px;
  background: ${(props) =>
    props.$active ? props.theme.sidebarActiveBackground : "transparent"};
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
