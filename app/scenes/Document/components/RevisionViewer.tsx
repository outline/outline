import { observer } from "mobx-react";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { colorPalette } from "@shared/constants";
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
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { type Editor as TEditor } from "~/editor";
import { ChangesetHelper } from "@shared/editor/lib/ChangesetHelper";
import CodeWordBreak from "@shared/editor/extensions/CodeWordBreak";
import { useDocumentContext } from "~/components/DocumentContext";

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
  const { revisions } = useStores();
  const { setEditor, setTotalChanges } = useDocumentContext();
  const query = useQuery();
  const showChanges = props.showChanges ?? query.has("changes");
  const compareToParam = query.get("compareTo");

  const compareToRevisionId = React.useMemo(() => {
    if (!compareToParam) {
      return undefined;
    }
    return compareToParam === "latest"
      ? RevisionHelper.latestId(revision.documentId)
      : compareToParam;
  }, [compareToParam, revision.documentId]);

  const compareToRevision = compareToRevisionId
    ? revisions.get(compareToRevisionId)
    : undefined;

  const comparisonData = compareToRevisionId
    ? compareToRevision?.data
    : revision.before?.data;

  // Revisions are listed without their content, so when diffing against the
  // previous revision ensure its content has been loaded. The directly viewed
  // and `compareTo` revisions are loaded by the document DataLoader.
  const beforeRevisionId = compareToRevisionId
    ? undefined
    : revision.before?.id;
  React.useEffect(() => {
    if (showChanges && beforeRevisionId) {
      void revisions.fetch(beforeRevisionId);
    }
  }, [showChanges, beforeRevisionId, revisions]);

  /**
   * Create editor extensions with the Diff extension configured to render
   * the calculated changes as decorations in the editor. The change count is
   * derived from the same changeset so the indicator can render before the
   * editor and its Diff extension have finished mounting.
   */
  const { extensions, totalChanges } = React.useMemo(() => {
    const changeset = ChangesetHelper.getChangeset(
      revision.data,
      comparisonData
    );
    return {
      extensions: [
        CodeWordBreak,
        ...withComments(richExtensions),
        ...(showChanges && changeset?.changes
          ? [new Diff({ changes: changeset?.changes })]
          : []),
      ],
      totalChanges: showChanges
        ? Diff.countChanges(changeset?.changes ?? null)
        : 0,
    };
  }, [revision.data, comparisonData, showChanges]);

  // Publish the change count so the header indicator can render immediately,
  // without waiting for the lazily-loaded editor to mount.
  React.useEffect(() => {
    setTotalChanges(totalChanges);
    return () => setTotalChanges(0);
  }, [totalChanges, setTotalChanges]);

  // The editor builds its extensions once, on mount, so it has to be remounted
  // whenever the diff configuration changes. Revisions are listed without their
  // content, so the revision being compared against — and with it the Diff
  // extension — usually only arrives on a later render; without this neither
  // the highlights nor the change count would ever appear.
  const editorKey = [
    showChanges ? "changes" : "no-changes",
    compareToRevisionId ?? revision.before?.id ?? "none",
    comparisonData ? "loaded" : "pending",
    revision.data ? "loaded" : "pending",
  ].join("-");

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
        $rtl={revision.rtl}
      />
      <Editor
        key={editorKey}
        ref={mergeRefs([ref, setEditor])}
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
