import { observer } from "mobx-react";
import * as React from "react";
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
import Diff from "@shared/editor/extensions/Diff";
import { ChangesetHelper } from "@shared/editor/lib/ChangesetHelper";
import useQuery from "~/hooks/useQuery";

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
  const query = useQuery();
  const showChanges = query.has("changes");

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

  /**
   * Calculate the changeset (insertions and deletions) between the previous revision
   * and the current revision being viewed.
   *
   * This uses ProseMirror's changeset calculation to determine what text was added
   * (inserted) and what text was removed (deleted) when this revision was created.
   * If there's no previous revision (i.e., this is the first revision), no diff is shown.
   */
  const result = React.useMemo(
    () => ChangesetHelper.getChanges(revision.data, previousRevision?.data),
    [previousRevision, revision?.data]
  );

  /**
   * Create editor extensions with the Diff extension configured to render
   * the calculated changes as decorations in the editor.
   */
  const extensions = React.useMemo(
    () => [
      ...withComments(withUIExtensions(richExtensions)),
      ...(showChanges ? [new Diff({ changes: result?.changes })] : []),
    ],
    [result, showChanges]
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
      <Editor
        defaultValue={result?.doc || revision.data}
        extensions={extensions}
        dir={revision.dir}
        readOnly
      />
      {children}
    </Flex>
  );
}

export default observer(RevisionViewer);
