import { observer } from "mobx-react";
import * as React from "react";
import { Node, Schema } from "prosemirror-model";
import { ChangeSet } from "prosemirror-changeset";
import { recreateTransform } from "@manuscripts/prosemirror-recreate-steps";
import { colorPalette } from "@shared/utils/collections";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import { Meta as DocumentMeta } from "./DocumentMeta";
import DocumentTitle from "./DocumentTitle";
import Editor, { Props as EditorProps } from "~/components/Editor";
import { withUIExtensions } from "~/editor/extensions";
import { richExtensions, withComments } from "@shared/editor/nodes";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import Diff, { type DiffChanges } from "@shared/editor/extensions/Diff";

type Props = Omit<EditorProps, "extensions"> & {
  /** The ID of the revision */
  id: string;
  /** The current document */
  document: Document;
  /** The revision to display */
  revision: Revision;
  children?: React.ReactNode;
};

/**
 * Displays a revision with diff highlighting showing changes from the previous revision.
 *
 * This component shows the content of a specific revision with visual diff indicators
 * that highlight what changed compared to the revision that came before it. Insertions
 * are shown with a highlight background, and deletions are shown with strikethrough.
 *
 * @param props - Component props including the revision to display and current document
 */
function RevisionViewer(props: Props) {
  const { document, children, revision } = props;
  const { revisions } = useStores();

  /**
   * Get the previous revision (chronologically earlier) for comparison.
   *
   * Revisions are sorted by creation date (newest first), so the "previous" revision
   * is the one that comes after the current revision in the sorted list.
   */
  const previousRevision = React.useMemo(() => {
    const allRevisions = revisions
      .getByDocumentId(document.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const currentIndex = allRevisions.findIndex((r) => r.id === revision.id);
    return currentIndex >= 0 && currentIndex < allRevisions.length - 1
      ? allRevisions[currentIndex + 1]
      : null;
  }, [revisions, document.id, revision.id]);

  console.log(
    "Comparing" +
      revision.id +
      " to " +
      (previousRevision ? previousRevision.id : "null")
  );

  /**
   * Calculate the changeset (insertions and deletions) between the previous revision
   * and the current revision being viewed.
   *
   * This uses ProseMirror's changeset calculation to determine what text was added
   * (inserted) and what text was removed (deleted) when this revision was created.
   * If there's no previous revision (i.e., this is the first revision), no diff is shown.
   */
  const changes = React.useMemo<DiffChanges | null>(() => {
    if (!previousRevision) {
      console.log("NO previous");
      // This is the first revision, nothing to compare against
      return null;
    }

    try {
      // Create schema from extensions
      const extensionManager = new ExtensionManager(
        withComments(withUIExtensions(richExtensions))
      );
      const schema = new Schema({
        nodes: extensionManager.nodes,
        marks: extensionManager.marks,
      });

      // Parse documents from JSON (old = previous revision, new = current revision)
      const docOld = Node.fromJSON(schema, previousRevision.data);
      const docNew = Node.fromJSON(schema, revision.data);

      // Calculate the transform and changeset
      const tr = recreateTransform(docOld, docNew);
      const changeSet = ChangeSet.create(docOld).addSteps(
        tr.doc,
        tr.mapping.maps
      );

      // Convert changeset to our format
      const inserted = changeSet.inserted.map((insertion) => ({
        from: insertion.from,
        to: insertion.to,
      }));

      const deleted = changeSet.deleted.map((deletion) => ({
        from: deletion.pos,
        to: deletion.pos + deletion.to - deletion.from,
      }));

      console.log({
        inserted,
        deleted,
      });

      return {
        inserted,
        deleted,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [previousRevision?.data, revision?.data]);

  /**
   * Create editor extensions with the Diff extension configured to render
   * the calculated changes as decorations in the editor.
   */
  const extensions = React.useMemo(
    () => [
      ...withComments(withUIExtensions(richExtensions)),
      new Diff({ changes }),
    ],
    [changes]
  );

  return (
    <Flex auto column>
      <DocumentTitle
        documentId={revision.documentId}
        title={revision.title}
        icon={revision.icon}
        color={revision.color ?? colorPalette[0]}
        readOnly
      />
      <DocumentMeta
        document={document}
        revision={revision}
        to={documentPath(document)}
        rtl={revision.rtl}
      />
      <Editor value={revision.data} extensions={extensions} />
      {children}
    </Flex>
  );
}

export default observer(RevisionViewer);
