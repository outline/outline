import type { Mark, Slice } from "prosemirror-model";
import { Node, Schema } from "prosemirror-model";
import type { Change, TokenEncoder } from "prosemirror-changeset";
import { ChangeSet, simplifyChanges } from "prosemirror-changeset";
import { ReplaceStep, type Step } from "prosemirror-transform";
import ExtensionManager from "./ExtensionManager";
import { recreateTransform } from "./prosemirror-recreate-transform";
import { richExtensions, withComments } from "../nodes";
import type { ProsemirrorData } from "../../types";

export type DiffChanges = {
  changes: readonly Change[];
  doc: Node;
};

class AttributeEncoder implements TokenEncoder<string | number> {
  public encodeCharacter(char: number, marks: Mark[]): string | number {
    return `${char}:${this.encodeMarks(marks)}`;
  }

  public encodeNodeStart(node: Node): string {
    const nodeName = node.type.name;
    const marks = node.marks;

    // Add node attributes if they exist
    let nodeStr = nodeName;

    // Enable more attribute encoding as tested
    if (node.type.name === "mention" && Object.keys(node.attrs).length) {
      nodeStr += ":" + JSON.stringify(node.attrs);
    }

    if (!marks.length) {
      return nodeStr;
    }

    return `${nodeStr}:${this.encodeMarks(marks)}`;
  }

  // See: https://github.com/ProseMirror/prosemirror-changeset/blob/23f67c002e5489e454a0473479e407decb238afe/src/diff.ts#L26
  public encodeNodeEnd({ type }: Node): number {
    let cache: Record<string, number> =
      type.schema.cached.changeSetIDs ||
      (type.schema.cached.changeSetIDs = Object.create(null));
    let id = cache[type.name];
    if (id === null) {
      cache[type.name] = id =
        Object.keys(type.schema.nodes).indexOf(type.name) + 1;
    }
    return id;
  }

  public compareTokens(a: string | number, b: string | number): boolean {
    return a === b;
  }

  private encodeMarks(marks: readonly Mark[]): string {
    return marks
      .map((m) => {
        let result = m.type.name;
        if (Object.keys(m.attrs).length) {
          result += ":" + JSON.stringify(m.attrs);
        }
        return result;
      })
      .sort()
      .join(",");
  }
}

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
      }>(docOld, undefined, this.attributeEncoder).addSteps(
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

  private static attributeEncoder = new AttributeEncoder();
}
