import { Node, Schema, Slice } from "prosemirror-model";
import {
  Change,
  ChangeSet,
  simplifyChanges,
  Span,
} from "prosemirror-changeset";
import { ReplaceStep, type Step } from "prosemirror-transform";
import ExtensionManager from "./ExtensionManager";
import { recreateTransform } from "./prosemirror-recreate-transform";
import { richExtensions, withComments } from "../nodes";
import type { ProsemirrorData } from "../../types";

export type DiffChanges = {
  changes: readonly Change[];
  doc: Node;
};

export class ChangesetHelper {
  /**
   * Calculates a changeset between two revisions of a document.
   *
   * @param revision - The current revision data.
   * @param previousRevision - The previous revision data to compare against.
   * @returns An object containing the simplified changes and the new document.
   */
  public static getChangeset(
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
      const tr = recreateTransform(docOld, docNew, {
        complexSteps: false,
        wordDiffs: true,
        simplifyDiff: true,
      });

      // Map steps to capture the actual content being replaced from the document
      // state at that specific step. This ensures deleted content is correctly
      // captured for diff rendering.
      const changeset = ChangeSet.create<{
        step: Step;
        slice: Slice | null;
      }>(docOld).addSteps(
        tr.doc,
        tr.mapping.maps,
        tr.steps.map((step, i) => ({
          step,
          slice:
            step instanceof ReplaceStep
              ? tr.docs[i].slice(step.from, step.to)
              : null,
        }))
      );

      let changes = simplifyChanges(changeset.changes, docNew);

      return {
        changes,
        doc: tr.doc,
      };
    } catch {
      return null;
    }
  }
}
