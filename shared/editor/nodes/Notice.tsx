import type Token from "markdown-it/lib/token.mjs";
import { WarningIcon, InfoIcon, StarredIcon, DoneIcon } from "outline-icons";
import { wrappingInputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
} from "prosemirror-model";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import type { Primitive } from "utility-types";
import toggleWrap from "../commands/toggleWrap";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import noticesRule from "../rules/notices";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps } from "../types";
import Node from "./Node";

export enum NoticeTypes {
  Info = "info",
  Success = "success",
  Tip = "tip",
  Warning = "warning",
}

export default class Notice extends Node {
  get name() {
    return "container_notice";
  }

  get rulePlugins() {
    return [noticesRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        style: {
          default: NoticeTypes.Info,
        },
      },
      content:
        "(list | blockquote | hr | paragraph | heading | code_block | code_fence | attachment)+",
      group: "block",
      defining: true,
      draggable: true,
      parseDOM: [
        {
          tag: `div.${EditorStyleHelper.notice}`,
          preserveWhitespace: "full",
          contentElement: (node: HTMLDivElement) =>
            node.querySelector(`div.${EditorStyleHelper.noticeContent}`) ||
            node,
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes(NoticeTypes.Tip)
              ? NoticeTypes.Tip
              : dom.className.includes(NoticeTypes.Warning)
                ? NoticeTypes.Warning
                : dom.className.includes(NoticeTypes.Success)
                  ? NoticeTypes.Success
                  : undefined,
          }),
        },
        // Quill editor parsing
        {
          tag: "div.ql-hint",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.dataset.hint,
          }),
        },
        // GitBook parsing
        {
          tag: "div.alert.theme-admonition",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes(NoticeTypes.Warning)
              ? NoticeTypes.Warning
              : dom.className.includes(NoticeTypes.Success)
                ? NoticeTypes.Success
                : undefined,
          }),
        },
        // Confluence parsing
        {
          tag: "div.confluence-information-macro",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            style: dom.className.includes("confluence-information-macro-tip")
              ? NoticeTypes.Success
              : dom.className.includes("confluence-information-macro-note")
                ? NoticeTypes.Tip
                : dom.className.includes("confluence-information-macro-warning")
                  ? NoticeTypes.Warning
                  : undefined,
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        { class: `${EditorStyleHelper.notice} ${node.attrs.style}` },
        ["div", { class: EditorStyleHelper.noticeContent }, 0],
      ],
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      container_notice: (attrs: Record<string, Primitive>) =>
        toggleWrap(type, attrs),
      info: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NoticeTypes.Info),
      warning: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NoticeTypes.Warning),
      success: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NoticeTypes.Success),
      tip: (): Command => (state, dispatch) =>
        this.handleStyleChange(state, dispatch, NoticeTypes.Tip),
    };
  }

  handleStyleChange = (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined,
    style: NoticeTypes
  ): boolean => {
    const { tr, selection } = state;
    const { $from } = selection;
    const node = $from.node(-1);

    if (node?.type.name === this.name) {
      if (dispatch) {
        const transaction = tr.setNodeMarkup($from.before(-1), undefined, {
          ...node.attrs,
          style,
        });
        dispatch(transaction);
      }
      return true;
    }
    return false;
  };

  component = (props: ComponentProps) => {
    const { node } = props;

    let icon;
    if (node.attrs.style === NoticeTypes.Tip) {
      icon = <StarredIcon />;
    } else if (node.attrs.style === NoticeTypes.Warning) {
      icon = <WarningIcon />;
    } else if (node.attrs.style === NoticeTypes.Success) {
      icon = <DoneIcon />;
    } else {
      icon = <InfoIcon />;
    }

    return (
      <div className={`${EditorStyleHelper.notice} ${node.attrs.style}`}>
        <div className={EditorStyleHelper.noticeIcon} contentEditable={false}>
          {icon}
        </div>
        <div
          className={EditorStyleHelper.noticeContent}
          ref={props.contentRef}
        />
      </div>
    );
  };

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^:::$/, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n:::" + (node.attrs.style || "info") + "\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(":::");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "container_notice",
      getAttrs: (tok: Token) => ({ style: tok.info }),
    };
  }
}
