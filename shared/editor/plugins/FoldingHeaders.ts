import { EditorState, Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Editor } from "../../../app/editor";
import Storage from "../../utils/Storage";
import { headingToPersistenceKey } from "../lib/headingToSlug";
import { findBlockNodes } from "../queries/findChildren";
import findCollapsedNodes from "../queries/findCollapsedNodes";

export const key = new PluginKey("folding");

export class FoldingHeadersPlugin extends Plugin {
  constructor(editor: Editor) {
    super({
      key,
      state: {
        init: (_, state) => {
          let decorations = [];
          const blocks = findBlockNodes(state.doc);

          for (const block of blocks) {
            if (block.node.type.name === "heading") {
              const persistKey = headingToPersistenceKey(
                block.node,
                editor.props.id
              );
              const persistedState = Storage.get(persistKey);

              if (persistedState === "collapsed") {
                decorations.push(
                  Decoration.node(block.pos, block.pos + block.node.nodeSize, {
                    class: "collapsed-heading",
                  })
                );
              }
            }
          }

          const set = DecorationSet.create(state.doc, decorations);
          decorations = [
            ...decorations,
            ...findCollapsedNodes(state, set).map((block) =>
              Decoration.node(block.pos, block.pos + block.node.nodeSize, {
                class: "folded-content",
              })
            ),
          ];

          console.log({ decorations });
          return DecorationSet.create(state.doc, decorations);
        },
        apply: (
          tr: Transaction,
          set: DecorationSet,
          _oldState: EditorState,
          newState: EditorState
        ) => {
          set = set.map(tr.mapping, tr.doc);
          const action = tr.getMeta(key);

          if (!action && !tr.docChanged) {
            return set;
          }

          if (action) {
            if (action.attrs.collapsed) {
              set = set.add(newState.doc, [
                Decoration.node(
                  action.from,
                  action.to,
                  {
                    class: "collapsed-heading",
                  },
                  {
                    collapsed: true,
                  }
                ),
              ]);
            } else {
              set = set.remove(set.find(action.from, action.to));
            }
          }

          const foldedHeadingDecos = set.find(
            undefined,
            undefined,
            (spec) => spec.collapsed
          );
          const newSet = DecorationSet.create(newState.doc, foldedHeadingDecos);
          const collapsedNodes = findCollapsedNodes(newState, newSet);

          console.log({
            collapsedNodes,
            foldedHeadingDecos,
          });

          return newSet.add(
            newState.doc,
            collapsedNodes.map((block) =>
              Decoration.node(block.pos, block.pos + block.node.nodeSize, {
                class: "folded-content",
              })
            )
          );
        },
      },
      appendTransaction: (transactions, oldState, newState) => {
        if (editor.props.readOnly) {
          return;
        }

        const { tr } = newState;
        let modified = false;

        for (const transaction of transactions) {
          const action = transaction.getMeta(key);
          if (action) {
            tr.setNodeMarkup(action.from, undefined, action.attrs);
            modified = true;
          }
        }

        return modified ? tr : null;
      },
      props: {
        decorations: (state) => this.getState(state),
      },
    });
  }
}
