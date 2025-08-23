import { format } from "date-fns";
import { Token } from "markdown-it";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, Plugin } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { v4 as uuidv4 } from "uuid";

import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { ComponentProps } from "../types";
import Node from "./Node";
import { DateChip } from "../components/DateChip";

export default class Date extends Node {
  get name() {
    return "date";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          default: undefined,
        },
        date: {
          default: "",
        },
        label: {
          default: undefined,
        },
      },
      inline: true,
      marks: "",
      group: "inline",
      atom: true,
      parseDOM: [
        {
          tag: `.${this.name}`,
          preserveWhitespace: "full",
          priority: 100,
          getAttrs: (dom: HTMLElement) => {
            const id = dom.id;
            const date = dom.dataset.date;
            const label = dom.dataset.label;

            return {
              id,
              date: date || "",
              label,
            };
          },
        },
      ],
      toDOM: (node) => [
        "span",
        {
          class: `${node.type.name} date-chip mention`,
          id: node.attrs.id,
          "data-date": node.attrs.date,
          "data-label": node.attrs.label,
        },
        (() => {
          if (!node.attrs.date) {
            return "Choose a date";
          }
          try {
            return (
              node.attrs.label ||
              format(new Date(node.attrs.date), "dd-MMM-yyyy")
            );
          } catch (_error) {
            return node.attrs.label || "Invalid date";
          }
        })(),
      ],
      toPlainText: (node) => {
        if (!node.attrs.date) {
          return "Choose a date";
        }
        try {
          return (
            node.attrs.label || format(new Date(node.attrs.date), "dd-MMM-yyyy")
          );
        } catch (_error) {
          return node.attrs.label || "Invalid date";
        }
      },
    };
  }

  component = (props: ComponentProps) => (
    <DateChip {...props} onUpdateDate={this.handleUpdateDate(props)} />
  );

  get plugins() {
    return [
      // Ensure dates have unique IDs
      new Plugin({
        appendTransaction: (_transactions, _oldState, newState) => {
          const tr = newState.tr;
          const existingIds = new Set();
          let modified = false;

          tr.doc.descendants((node, pos) => {
            let nodeId = node.attrs.id;
            if (
              node.type.name === this.name &&
              (!nodeId || existingIds.has(nodeId))
            ) {
              nodeId = uuidv4();
              modified = true;
              tr.setNodeAttribute(pos, "id", nodeId);
            }
            existingIds.add(nodeId);
          });

          if (modified) {
            return tr;
          }

          return null;
        },
      }),
    ];
  }

  keys(): Record<string, Command> {
    return {
      Enter: (state, _dispatch) => {
        const { selection } = state;
        const { $from } = selection;
        const node = $from.node();

        if (node.type.name === this.name) {
          // Open date picker on Enter
          return true;
        }

        return false;
      },
    };
  }

  handleUpdateDate =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (date: Date) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        date: date.toISOString(),
      });

      view.dispatch(transaction);
    };

  commands({ type }: { type: NodeType; schema: Schema }) {
    return {
      date_unfurl:
        (attrs: Record<string, Primitive> = {}): Command =>
        (state, dispatch) => {
          const { selection } = state;
          const { $from } = selection;
          const node = $from.node();

          // If we're in a paragraph, replace it with a date node
          if (node.type.name === "paragraph") {
            const dateNode = type.create({
              id: uuidv4(),
              date: (() => {
                if (attrs.date) {
                  try {
                    return new Date(attrs.date).toISOString();
                  } catch (_error) {
                    // Don't set a default date - let user pick
                    return "";
                  }
                }
                // Don't set a default date - let user pick
                return "";
              })(),
              label: attrs.label,
            });

            const transaction = state.tr.replaceWith(
              $from.start(),
              $from.end(),
              dateNode
            );

            dispatch?.(transaction);
            return true;
          }

          return false;
        },
      createDate_unfurl:
        (attrs: Record<string, Primitive> = {}): Command =>
        (state, dispatch) => {
          const { selection } = state;
          const { $from } = selection;
          const node = $from.node();

          // If we're in a paragraph, replace it with a date node
          if (node.type.name === "paragraph") {
            const dateNode = type.create({
              id: uuidv4(),
              date: (() => {
                if (attrs.date) {
                  try {
                    return new Date(attrs.date).toISOString();
                  } catch (_error) {
                    // Don't set a default date - let user pick
                    return "";
                  }
                }
                // Don't set a default date - let user pick
                return "";
              })(),
              label: attrs.label,
            });

            const transaction = state.tr.replaceWith(
              $from.start(),
              $from.end(),
              dateNode
            );

            dispatch?.(transaction);
            return true;
          }

          return false;
        },
    };
  }

  parseMarkdown() {
    return {
      block: "date",
      getAttrs: (tok: Token) => ({
        id: uuidv4(),
        date: (() => {
          if (tok.attrs?.date) {
            try {
              return new Date(tok.attrs.date).toISOString();
            } catch (_error) {
              return "";
            }
          }
          return "";
        })(),
        label: tok.attrs?.label,
      }),
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    if (!node.attrs.date) {
      state.write(`[Choose a date](date:)`);
      return;
    }
    try {
      const date = format(new Date(node.attrs.date), "yyyy-MM-dd");
      state.write(`[${node.attrs.label || date}](date:${date})`);
    } catch (_error) {
      state.write(`[Invalid date](date:)`);
    }
  }
}
