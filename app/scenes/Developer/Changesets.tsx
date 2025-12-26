import * as React from "react";
import { CenteredContent, PageTitle } from "~/components";
import RevisionViewer from "~/scenes/Document/components/RevisionViewer";
import type { Revision } from "~/models/Revision";
import type { Document } from "~/models/Document";

export default function Changesets() {
  // Mock Document object
  const mockDocument = {
    id: "document-id-123",
    path: "/doc/document-id-123",
    title: "Test Document",
    url: "/doc/test-document-123",
  } as Document;

  // Mock new content (ProseMirror JSON with an added paragraph)
  const newContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is the original paragraph.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a new paragraph.",
          },
        ],
      },
    ],
  };

  // Simulate a changeset for the added paragraph
  // This is a simplified representation. A real changeset would be generated
  // by a diffing library like prosemirror-changeset.
  const mockChangeset = {
    type: "changeset",
    // These values would typically come from a diff algorithm
    // For a paragraph added at the end:
    // fromA: position before the new paragraph in old doc
    // toA: position before the new paragraph in old doc (insert, so no old content)
    // fromB: position before the new paragraph in new doc
    // toB: position after the new paragraph in new doc
    changes: [
      {
        fromA: 33, // End of "This is the original paragraph." + 1 for paragraph node
        toA: 33,
        fromB: 33, // Position in the new document
        toB: 60, // End of new paragraph "This is a new paragraph." + 1 for paragraph node
      },
    ],
  };

  // Mock Revision object
  const mockRevision = {
    id: "revision-id-456",
    documentId: mockDocument.id,
    title: "Test Document Revision",
    data: newContent, // The content of the revision being viewed
    changeset: mockChangeset, // The diff information
    createdAt: new Date().toISOString(),
    createdById: "user-id-789",
    user: {
      name: "Test User",
    },
    color: "#FEDCBA",
  } as Revision;

  return (
    <CenteredContent>
      <PageTitle title="Changesets" />
      <h1>Changesets Screen</h1>
      <p>This is a placeholder for the changesets screen.</p>
      <RevisionViewer
        document={mockDocument}
        revision={mockRevision}
        id={mockRevision.id}
        showChanges={true}
      />
    </CenteredContent>
  );
}
