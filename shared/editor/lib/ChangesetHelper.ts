import type { Mark, Slice } from "prosemirror-model";
import { Node, Schema } from "prosemirror-model";
import type { Change, TokenEncoder } from "prosemirror-changeset";
import { ChangeSet, simplifyChanges } from "prosemirror-changeset";
import { ReplaceStep, type Step } from "prosemirror-transform";
import ExtensionManager from "./ExtensionManager";
import { recreateTransform } from "./prosemirror-recreate-transform";
import { richExtensions, withComments } from "../nodes";
import type { ProsemirrorData } from "../../types";

/**
 * Represents a modification (attribute change) in the document.
 */
export type Modification = {
  length: number;
  data: {
    step: Step;
    slice: Slice | null;
    oldAttrs: Record<string, unknown>;
    newAttrs: Record<string, unknown>;
  };
};

/**
 * Extended Change type that includes modifications.
 */
export interface ExtendedChange extends Change {
  modified: readonly Modification[];
}

export type DiffChanges = {
  changes: readonly ExtendedChange[];
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
    if (Object.keys(node.attrs).length) {
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

      // Post-process changes to detect modifications (attribute-only changes)
      const extendedChanges: ExtendedChange[] = changes.map((change) => {
        const modified: Modification[] = [];
        const matchedDeletionIndices = new Set<number>();
        const matchedInsertionIndices = new Set<number>();

        // Each deletion entry contains both old (step.slice) and new (slice) content
        // Check if the deletion represents a modification by comparing these
        for (let i = 0; i < change.deleted.length; i++) {
          const deletion = change.deleted[i];

          if (!deletion.data.slice || !deletion.data.step.slice) {
            continue;
          }

          // deletion.data.step.slice = OLD content (what was in the document)
          // deletion.data.slice = NEW content (what it changed to)
          const oldSlice = deletion.data.step.slice;
          const newSlice = deletion.data.slice;

          // Check if both slices have the same number of nodes
          if (
            oldSlice.content.childCount === newSlice.content.childCount &&
            oldSlice.content.childCount > 0
          ) {
            let isModification = true;
            const nodes: Array<{
              oldNode: Node;
              newNode: Node;
            }> = [];

            // Check each corresponding node pair
            for (let index = 0; index < oldSlice.content.childCount; index++) {
              const oldNode = oldSlice.content.child(index);
              const newNode = newSlice.content.child(index);

              // For modifications, we allow:
              // 1. Same node type with different attributes (e.g., code_block language change)
              // 2. Related node types with same semantic group (e.g., td <-> th share "tableCell" group)
              const isSameType = oldNode.type.name === newNode.type.name;

              // Check if nodes share a common semantic group (excluding generic "block"/"inline")
              const getSemanticGroups = (node: Node): Set<string> => {
                const groups = node.type.spec.group?.split(" ") || [];
                return new Set(
                  groups.filter((g) => g !== "block" && g !== "inline")
                );
              };

              const oldGroups = getSemanticGroups(oldNode);
              const newGroups = getSemanticGroups(newNode);
              const hasSharedGroup = Array.from(oldGroups).some((g) =>
                newGroups.has(g)
              );
              const isRelatedNodeType = !isSameType && hasSharedGroup;

              try {
                if (
                  oldNode.textContent !== newNode.textContent ||
                  (!isSameType && !isRelatedNodeType)
                ) {
                  isModification = false;
                } else if (
                  isSameType &&
                  JSON.stringify(oldNode.attrs) ===
                    JSON.stringify(newNode.attrs)
                ) {
                  // Same type and same attributes = not a modification
                  isModification = false;
                }

                nodes.push({ oldNode, newNode });
              } catch {
                isModification = false;
              }
            }

            if (isModification) {
              modified.push({
                length: deletion.length,
                data: {
                  step: deletion.data.step,
                  slice: deletion.data.slice,
                  oldAttrs: nodes.length === 1 ? nodes[0].oldNode.attrs : {},
                  newAttrs: nodes.length === 1 ? nodes[0].newNode.attrs : {},
                },
              });

              // Mark this deletion for removal
              matchedDeletionIndices.add(i);

              // Also find and mark corresponding insertion for removal
              for (let j = 0; j < change.inserted.length; j++) {
                const insertion = change.inserted[j];
                if (
                  insertion.length === deletion.length &&
                  !matchedInsertionIndices.has(j)
                ) {
                  matchedInsertionIndices.add(j);
                  break;
                }
              }
            }
          }
        }

        return {
          ...change,
          deleted: change.deleted.filter(
            (_, index) => !matchedDeletionIndices.has(index)
          ),
          inserted: change.inserted.filter(
            (_, index) => !matchedInsertionIndices.has(index)
          ),
          modified,
        };
      });

      return {
        changes: extendedChanges,
        doc: tr.doc,
      };
    } catch {
      return null;
    }
  }

  private static attributeEncoder = new AttributeEncoder();
}
