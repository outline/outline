import type Token from "markdown-it/lib/token.mjs";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import * as React from "react";
import type { Primitive } from "utility-types";
import DatabaseBlockComponent from "../components/DatabaseBlock";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import databasesRule, { databaseHref } from "../rules/databases";
import type { ComponentProps } from "../types";
import Node from "./Node";

/**
 * An atom block node that renders a live table over the documents of a
 * database collection, inline in a host document. The node stores no data —
 * only the collection (and optionally saved view) it reads from.
 */
export default class DatabaseBlock extends Node {
  get name() {
    return "database";
  }

  get rulePlugins() {
    return [databasesRule];
  }

  get schema(): NodeSpec {
    return {
      group: "block",
      atom: true,
      attrs: {
        databaseId: {
          default: "",
          validate: "string",
        },
        viewId: {
          default: null,
        },
      },
      parseDOM: [
        {
          tag: "div.database-block",
          getAttrs: (dom: HTMLDivElement) => ({
            databaseId: dom.getAttribute("data-database-id") ?? "",
            viewId: dom.getAttribute("data-view-id"),
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: "database-block",
          "data-database-id": node.attrs.databaseId,
          ...(node.attrs.viewId ? { "data-view-id": node.attrs.viewId } : {}),
        },
        "Database",
      ],
      leafText: () => "Database",
    };
  }

  handleChangeDatabase =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (databaseId: string) => {
      const { view } = this.editor;
      const { tr } = view.state;
      view.dispatch(
        tr.setNodeMarkup(getPos(), undefined, {
          ...node.attrs,
          databaseId,
        })
      );
    };

  handleChangeView =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (viewId: string | null) => {
      const { view } = this.editor;
      const { tr } = view.state;
      view.dispatch(
        tr.setNodeMarkup(getPos(), undefined, {
          ...node.attrs,
          viewId,
        })
      );
    };

  component = (props: ComponentProps) => (
    <DatabaseBlockComponent
      {...props}
      onChangeDatabase={this.handleChangeDatabase(props)}
      onChangeView={this.handleChangeView(props)}
    />
  );

  commands({ type }: { type: NodeType }) {
    return {
      database:
        (attrs: Record<string, Primitive>): Command =>
        (state, dispatch) => {
          dispatch?.(
            state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
          );
          return true;
        },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    if (!node.attrs.databaseId) {
      return;
    }
    state.ensureNewLine();
    state.write(
      `[Database](${databaseHref(node.attrs.databaseId, node.attrs.viewId)})`
    );
    state.write("\n\n");
  }

  parseMarkdown() {
    return {
      node: "database",
      getAttrs: (token: Token) => ({
        databaseId: token.attrGet("databaseId"),
        viewId: token.attrGet("viewId"),
      }),
    };
  }
}
