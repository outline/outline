import { Node } from "prosemirror-model";

export type CommentMark = {
  id: string;
  userId: string;
};

/**
 * Iterates through the document to find all of the comment marks.
 *
 * @param doc Prosemirror document node
 * @returns Array<CommentMark>
 */
export default function getComments(doc: Node): CommentMark[] {
  const comments: CommentMark[] = [];

  doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === "comment") {
        comments.push(mark.attrs as CommentMark);
      }
    });

    return true;
  });

  return comments;
}
