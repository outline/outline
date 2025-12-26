import RevisionViewer from "~/scenes/Document/components/RevisionViewer";
import Scene from "~/components/Scene";
import Heading from "~/components/Heading";
import stores from "~/stores";

const mockDocument = stores.documents.add({
  id: "mock-document-id",
  title: "Mock Document",
  urlId: "mock-document-id",
  createdAt: "2024-01-01T12:00:00.000Z",
  updatedAt: "2024-01-02T12:00:00.000Z",
});

stores.revisions.add({
  id: "mock-revision-1",
  documentId: mockDocument.id,
  title: mockDocument.title,
  createdAt: "2024-01-01T12:00:00.000Z",
  data: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is the first paragraph of the document.",
          },
        ],
      },
    ],
  },
});

const mockRevision = stores.revisions.add({
  id: "mock-revision-2",
  documentId: mockDocument.id,
  title: mockDocument.title,
  createdAt: "2024-01-02T12:00:00.000Z",
  data: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is the first paragraph of the document.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is the second paragraph, added in this revision.",
          },
        ],
      },
    ],
  },
});

/**
 * Changesets scene for developer playground.
 */
export default function Changesets() {
  return (
    <Scene title="Changesets">
      <Heading>Changesets</Heading>
      <RevisionViewer
        document={mockDocument}
        revision={mockRevision}
        id={mockRevision.id}
        showChanges={true}
      />
    </Scene>
  );
}
