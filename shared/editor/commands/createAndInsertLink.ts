import { Node } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { toast } from "sonner";

function findPlaceholderLink(doc: Node, href: string) {
  let result: { pos: number; node: Node } | undefined;

  doc.descendants((node: Node, pos = 0) => {
    // get text nodes
    if (node.type.name === "text") {
      // get marks for text nodes
      node.marks.forEach((mark) => {
        // any of the marks links?
        if (mark.type.name === "link") {
          // any of the links to other docs?
          if (mark.attrs.href === href) {
            result = { node, pos };
          }
        }
      });

      return false;
    }

    if (!node.content.size) {
      return false;
    }

    return true;
  });

  return result;
}

const createAndInsertLink = async function (
  view: EditorView,
  title: string,
  href: string,
  options: {
    dictionary: any;
    onCreateLink: (title: string) => Promise<string>;
  }
) {
  const { dispatch, state } = view;
  const { onCreateLink } = options;

  try {
    const url = await onCreateLink(title);
    const result = findPlaceholderLink(view.state.doc, href);

    if (!result) {
      return;
    }

    dispatch(
      view.state.tr
        .removeMark(
          result.pos,
          result.pos + result.node.nodeSize,
          state.schema.marks.link
        )
        .addMark(
          result.pos,
          result.pos + result.node.nodeSize,
          state.schema.marks.link.create({ href: url })
        )
    );
  } catch (err) {
    const result = findPlaceholderLink(view.state.doc, href);
    if (!result) {
      return;
    }

    dispatch(
      view.state.tr.removeMark(
        result.pos,
        result.pos + result.node.nodeSize,
        state.schema.marks.link
      )
    );

    toast.error(options.dictionary.createLinkError);
  }
};

export default createAndInsertLink;
