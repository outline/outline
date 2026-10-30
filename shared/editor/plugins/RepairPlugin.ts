import type { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { changedDescendants } from "../lib/changedDescendants";
import { isLocalDocChange, isRemoteTransaction } from "../lib/multiplayer";
import type { NodeWithPos } from "../types";

export interface RepairSpec {
  /**
   * Whether the node must be repaired. Called for changed nodes, and for every
   * node when content that needs repair may exist. Must not have side effects.
   *
   * @param node The node to check.
   * @param pos The position of the node.
   * @param state The editor state.
   * @returns true if the node must be repaired.
   */
  needsRepair: (node: Node, pos: number, state: EditorState) => boolean;

  /**
   * Repair the given nodes.
   *
   * @param state The editor state.
   * @param nodes The nodes that need repair, in document order.
   * @returns a transaction with the repairs, or null if nothing changed.
   */
  repair: (state: EditorState, nodes: NodeWithPos[]) => Transaction | null;
}

/**
 * A plugin that repairs nodes in the document, such as by assigning missing
 * ids or fixing invalid structure. Repairs are only made in response to local
 * changes, otherwise every connected client writes the same repair and is
 * attributed as an editor. Content that needs repair, whether loaded or
 * received from a remote change, is repaired on the next local change.
 */
export class RepairPlugin extends Plugin<boolean> {
  constructor({ needsRepair, repair }: RepairSpec) {
    const find = (
      state: EditorState,
      iterate: (callback: (node: Node, pos: number) => void) => void
    ) => {
      const nodes: NodeWithPos[] = [];
      iterate((node, pos) => {
        if (needsRepair(node, pos, state)) {
          nodes.push({ node, pos });
        }
      });
      return nodes;
    };

    const findChanged = (oldState: EditorState, state: EditorState) =>
      find(state, (callback) =>
        changedDescendants(oldState.doc, state.doc, 0, callback)
      );

    super({
      state: {
        // Whether content that needs repair may exist outside of the nodes
        // changed locally, documents can be loaded in any state.
        init: () => true,
        apply: (tr, isPending, oldState, newState) => {
          if (!tr.docChanged) {
            return isPending;
          }
          if (!isRemoteTransaction(tr, newState)) {
            return false;
          }
          return isPending || findChanged(oldState, newState).length > 0;
        },
      },
      appendTransaction: (transactions, oldState, newState) => {
        if (!transactions.some((tr) => isLocalDocChange(tr, newState))) {
          return null;
        }

        const nodes = this.getState(oldState)
          ? find(newState, (callback) => newState.doc.descendants(callback))
          : findChanged(oldState, newState);

        return nodes.length > 0 ? repair(newState, nodes) : null;
      },
    });
  }
}
