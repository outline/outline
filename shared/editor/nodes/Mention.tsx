import isMatch from "lodash/isMatch";
import { Token } from "markdown-it";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import {
  Command,
  NodeSelection,
  Plugin,
  TextSelection,
} from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import env from "../../env";
import { MentionType, UnfurlResourceType, UnfurlResponse } from "../../types";
import {
  MentionCollection,
  MentionDocument,
  MentionIssue,
  MentionPullRequest,
  MentionUser,
} from "../components/Mentions";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import mentionRule from "../rules/mention";
import { ComponentProps } from "../types";
import Node from "./Node";

export default class Mention extends Node {
  get name() {
    return "mention";
  }

  get schema(): NodeSpec {
    const toPlainText = (node: ProsemirrorNode) =>
      node.attrs.type === MentionType.User
        ? `@${node.attrs.label}`
        : node.attrs.label;

    return {
      attrs: {
        type: {
          default: MentionType.User,
        },
        label: {},
        modelId: {},
        actorId: {
          default: undefined,
        },
        id: {
          default: undefined,
        },
        href: {
          default: undefined,
        },
        unfurl: {
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
            const type = dom.dataset.type;
            const modelId = dom.dataset.id;
            if (!type || !modelId) {
              return false;
            }

            return {
              type,
              modelId,
              actorId: dom.dataset.actorid,
              label: dom.innerText,
              id: dom.id,
              href: dom.getAttribute("href"),
              unfurl: dom.dataset.unfurl
                ? JSON.parse(dom.dataset.unfurl)
                : undefined,
            };
          },
        },
      ],
      toDOM: (node) => [
        node.attrs.type === MentionType.User ? "span" : "a",
        {
          class: `${node.type.name} use-hover-preview`,
          id: node.attrs.id,
          href:
            node.attrs.type === MentionType.User
              ? undefined
              : node.attrs.type === MentionType.Document
              ? `${env.URL}/doc/${node.attrs.modelId}`
              : node.attrs.type === MentionType.Collection
              ? `${env.URL}/collection/${node.attrs.modelId}`
              : node.attrs.href,
          "data-type": node.attrs.type,
          "data-id": node.attrs.modelId,
          "data-actorid": node.attrs.actorId,
          "data-url":
            node.attrs.type === MentionType.PullRequest ||
            node.attrs.type === MentionType.Issue
              ? node.attrs.href
              : `mention://${node.attrs.id}/${node.attrs.type}/${node.attrs.modelId}`,
          "data-unfurl": JSON.stringify(node.attrs.unfurl),
        },
        toPlainText(node),
      ],
      toPlainText,
    };
  }

  component = (props: ComponentProps) => {
    switch (props.node.attrs.type) {
      case MentionType.User:
        return <MentionUser {...props} />;
      case MentionType.Document:
        return <MentionDocument {...props} />;
      case MentionType.Collection:
        return <MentionCollection {...props} />;
      case MentionType.Issue:
        return (
          <MentionIssue
            {...props}
            onChangeUnfurl={this.handleChangeUnfurl(props)}
          />
        );
      case MentionType.PullRequest:
        return (
          <MentionPullRequest
            {...props}
            onChangeUnfurl={this.handleChangeUnfurl(props)}
          />
        );
      default:
        return null;
    }
  };

  get rulePlugins() {
    return [mentionRule];
  }

  get plugins() {
    return [
      // Ensure mentions have unique IDs
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
    const NavigableMention = [
      MentionType.Collection,
      MentionType.Document,
      MentionType.Issue,
      MentionType.PullRequest,
    ];

    return {
      Enter: (state) => {
        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          selection.node.type.name === this.name &&
          NavigableMention.includes(selection.node.attrs.type)
        ) {
          const mentionType = selection.node.attrs.type;

          let link: string;

          if (
            mentionType === MentionType.Issue ||
            mentionType === MentionType.PullRequest
          ) {
            link = selection.node.attrs.href;
          } else {
            const { modelId } = selection.node.attrs;

            const linkType =
              selection.node.attrs.type === MentionType.Document
                ? "doc"
                : "collection";

            link = `/${linkType}/${modelId}`;
          }

          this.editor.props.onClickLink?.(link);
          return true;
        }
        return false;
      },
    };
  }

  commands({ type }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        const { selection } = state;
        const position =
          selection instanceof TextSelection
            ? selection.$cursor?.pos
            : selection.$to.pos;
        if (position === undefined) {
          return false;
        }

        const node = type.create(attrs);
        const transaction = state.tr.insert(position, node);
        dispatch?.(transaction);
        return true;
      };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const mType = node.attrs.type;
    const mId = node.attrs.modelId;
    const label = node.attrs.label;
    const id = node.attrs.id;

    state.write(`@[${label}](mention://${id}/${mType}/${mId})`);
  }

  parseMarkdown() {
    return {
      node: "mention",
      getAttrs: (tok: Token) => ({
        id: tok.attrGet("id"),
        type: tok.attrGet("type"),
        modelId: tok.attrGet("modelId"),
        label: tok.content,
      }),
    };
  }

  handleChangeUnfurl =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (unfurl: UnfurlResponse[keyof UnfurlResponse]) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const label =
        unfurl.type === UnfurlResourceType.Issue ||
        unfurl.type === UnfurlResourceType.PR
          ? unfurl.title
          : undefined;

      const overrides: Record<string, unknown> = label ? { label } : {};
      overrides.unfurl = unfurl;

      const pos = getPos();

      if (!isMatch(node.attrs, overrides)) {
        const transaction = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          ...overrides,
        });
        view.dispatch(transaction);
      }
    };
}
