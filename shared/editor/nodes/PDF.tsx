import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import Attachment from "./Attachment";
import { NodeSelection } from "prosemirror-state";
import { ComponentProps } from "../types";
import PdfViewer from "../components/PDF";
import { Token } from "markdown-it";

export default class PDF extends Attachment {
  get name() {
    return "pdf";
  }

  get schema(): NodeSpec {
    return {
      ...super.schema,
      attrs: {
        ...super.schema.attrs,
        width: {
          default: undefined,
        },
        height: {
          default: undefined,
        },
        layoutClass: {
          default: null,
          validate: "string|null",
        },
      },
    };
  }

  handleChangeSize =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    ({ width, height }: { width: number; height?: number }) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width,
          height,
        })
        .setMeta("addToHistory", true);
      const $pos = transaction.doc.resolve(getPos());
      view.dispatch(transaction.setSelection(new NodeSelection($pos)));
    };

  component = (props: ComponentProps) => (
    <PdfViewer {...props} onChangeSize={this.handleChangeSize(props)} />
  );

  parseMarkdown() {
    return {
      node: "attachment",
      getAttrs: (tok: Token) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title"),
        size: tok.attrGet("size"),
        width: tok.attrGet("width"),
        height: tok.attrGet("height"),
      }),
    };
  }
}
