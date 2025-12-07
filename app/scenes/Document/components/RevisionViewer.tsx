import { observer } from "mobx-react";
import * as React from "react";
import { Node, Schema } from "prosemirror-model";
import { ChangeSet } from "prosemirror-changeset";
import { recreateTransform } from "@manuscripts/prosemirror-recreate-steps";
import { colorPalette } from "@shared/utils/collections";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import Flex from "~/components/Flex";
import { documentPath } from "~/utils/routeHelpers";
import { Meta as DocumentMeta } from "./DocumentMeta";
import DocumentTitle from "./DocumentTitle";
import Editor, { Props as EditorProps } from "~/components/Editor";
import { withUIExtensions } from "~/editor/extensions";
import { richExtensions } from "@shared/editor/nodes";
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
 * Displays revision HTML pre-rendered on the server.
 */
function RevisionViewer(props: Props) {
  const { document, children, revision } = props;

  // Calculate changeset between current document and revision
  const changes = React.useMemo<DiffChanges | null>(() => {
    try {
      // Create schema from extensions
      const extensionManager = new ExtensionManager(
        withUIExtensions(richExtensions)
      );
      const schema = new Schema({
        nodes: extensionManager.nodes,
        marks: extensionManager.marks,
      });

      // Parse documents from JSON
      const docOld = Node.fromJSON(schema, revision.data);
      const docNew = Node.fromJSON(schema, document.data);

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

      return { inserted, deleted };
    } catch (error) {
      return null;
    }
  }, [document.data, revision.data]);

  // Create extensions with diff rendering
  const extensions = React.useMemo(
    () => [...withUIExtensions(richExtensions), new Diff({ changes })],
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
      <Editor defaultValue={document.data} extensions={extensions} />
      {children}
    </Flex>
  );
}

export default observer(RevisionViewer);
