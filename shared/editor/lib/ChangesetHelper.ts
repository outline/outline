import { Node, Schema } from "prosemirror-model";
import { Change, ChangeSet } from "prosemirror-changeset";
import ExtensionManager from "./ExtensionManager";
import { recreateTransform } from "./prosemirror-recreate-transform";
import { richExtensions, withComments } from "../nodes";
import { ProsemirrorData } from "../../types";
import { Step } from "prosemirror-transform";

export type DiffChanges = {
  changes: readonly Change[];
  doc: Node;
};

export class ChangesetHelper {
  public static getChanges(
    revision?: ProsemirrorData | null,
    previousRevision?: ProsemirrorData | null
  ): DiffChanges | null {
    if (!revision || !previousRevision) {
      // This is the first revision, nothing to compare against
      return null;
    }

    try {
      // Create schema from extensions
      const extensionManager = new ExtensionManager(
        withComments(richExtensions)
      );
      const schema = new Schema({
        nodes: extensionManager.nodes,
        marks: extensionManager.marks,
      });

      // Parse documents from JSON (old = previous revision, new = current revision)
      const docOld = Node.fromJSON(schema, previousRevision);
      const docNew = Node.fromJSON(schema, revision);

      // Calculate the transform and changeset
      const tr = recreateTransform(docOld, docNew);
      const set = ChangeSet.create<Step>(docOld).addSteps(
        tr.doc,
        tr.mapping.maps,
        tr.steps
      );

      return {
        changes: set.changes,
        doc: tr.doc,
      };
    } catch {
      return null;
    }
  }
}
