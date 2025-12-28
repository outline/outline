import { observer } from "mobx-react";
import * as React from "react";
import { colorPalette } from "@shared/utils/collections";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import type { Props as EditorProps } from "~/components/Editor";
import Flex from "~/components/Flex";
import { documentPath } from "~/utils/routeHelpers";
import { Meta as DocumentMeta } from "./DocumentMeta";
import DocumentTitle from "./DocumentTitle";
import Editor from "~/components/Editor";
import { richExtensions, withComments } from "@shared/editor/nodes";
import Diff from "@shared/editor/extensions/Diff";
import useQuery from "~/hooks/useQuery";
import { type Editor as TEditor } from "~/editor";

type Props = Omit<EditorProps, "extensions"> & {
  /** The ID of the revision */
  id: string;
  /** The current document */
  document: Document;
  /** The revision to display */
  revision: Revision;
  /** Whether to show changes from the previous revision */
  showChanges?: boolean;
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
function RevisionViewer(props: Props, ref: React.Ref<TEditor>) {
  const { document, children, revision } = props;
  const query = useQuery();
  const showChanges = props.showChanges ?? query.has("changes");

  /**
   * Create editor extensions with the Diff extension configured to render
   * the calculated changes as decorations in the editor.
   */
  const extensions = React.useMemo(
    () => [
      ...withComments(richExtensions),
      ...(showChanges && revision.changeset?.changes
        ? [new Diff({ changes: revision.changeset?.changes })]
        : []),
    ],
    [revision.changeset, showChanges]
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
        ref={ref}
        defaultValue={revision.data}
        extensions={extensions}
        dir={revision.dir}
        readOnly
      />
      {children}
    </Flex>
  );
}

export default observer(React.forwardRef(RevisionViewer));
