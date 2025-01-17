import { Node, Schema } from "prosemirror-model";
import headingToSlug from "../editor/lib/headingToSlug";
import textBetween from "../editor/lib/textBetween";
import { getTextSerializers } from "../editor/lib/textSerializers";
import { ProsemirrorData } from "../types";
import { TextHelper } from "./TextHelper";

export type Heading = {
  /* The heading in plain text */
  title: string;
  /* The level of the heading */
  level: number;
  /* The unique id of the heading */
  id: string;
};

export type CommentMark = {
  /* The unique id of the comment */
  id: string;
  /* The id of the user who created the comment */
  userId: string;
  /* The text of the comment */
  text: string;
};

export type Task = {
  /* The text of the task */
  text: string;
  /* Whether the task is completed or not */
  completed: boolean;
};

interface User {
  name: string;
  language: string | null;
}

export const attachmentRedirectRegex =
  /\/api\/attachments\.redirect\?id=(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export const attachmentPublicRegex =
  /public\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export class ProsemirrorHelper {
  /**
   * Get a new empty document.
   *
   * @returns A new empty document as JSON.
   */
  static getEmptyDocument(): ProsemirrorData {
    return {
      type: "doc",
      content: [
        {
          content: [],
          type: "paragraph",
        },
      ],
    };
  }

  /**
   * Returns true if the data looks like an empty document.
   *
   * @param data The ProsemirrorData to check.
   * @returns True if the document is empty.
   */
  static isEmptyData(data: ProsemirrorData): boolean {
    if (data.type !== "doc") {
      return false;
    }

    if (data.content.length === 1) {
      const node = data.content[0];
      return (
        node.type === "paragraph" &&
        (node.content === null ||
          node.content === undefined ||
          node.content.length === 0)
      );
    }

    return data.content.length === 0;
  }

  /**
   * Returns the node as plain text.
   *
   * @param node The node to convert.
   * @param schema The schema to use.
   * @returns The document content as plain text without formatting.
   */
  static toPlainText(root: Node, schema: Schema) {
    const textSerializers = getTextSerializers(schema);
    return textBetween(root, 0, root.content.size, textSerializers);
  }

  /**
   * Removes any empty paragraphs from the beginning and end of the document.
   *
   * @returns True if the editor is empty
   */
  static trim(doc: Node) {
    const { schema } = doc.type;
    let index = 0,
      start = 0,
      end = doc.nodeSize - 2,
      isEmpty;

    if (doc.childCount <= 1) {
      return doc;
    }

    isEmpty = true;
    while (isEmpty) {
      const node = doc.maybeChild(index++);
      if (!node) {
        break;
      }
      isEmpty = ProsemirrorHelper.toPlainText(node, schema).trim() === "";
      if (isEmpty) {
        start += node.nodeSize;
      }
    }

    index = doc.childCount - 1;
    isEmpty = true;
    while (isEmpty) {
      const node = doc.maybeChild(index--);
      if (!node) {
        break;
      }
      isEmpty = ProsemirrorHelper.toPlainText(node, schema).trim() === "";
      if (isEmpty) {
        end -= node.nodeSize;
      }
    }

    return doc.cut(start, end);
  }

  /**
   * Returns true if the trimmed content of the passed document is an empty string.
   *
   * @returns True if the editor is empty
   */
  static isEmpty(doc: Node, schema?: Schema) {
    if (!schema) {
      return !doc || doc.textContent.trim() === "";
    }

    const textSerializers = getTextSerializers(schema);

    let empty = true;
    doc.descendants((child: Node) => {
      // If we've already found non-empty data, we can stop descending further
      if (!empty) {
        return false;
      }

      const toPlainText = textSerializers[child.type.name];
      if (toPlainText) {
        empty = !toPlainText(child).trim();
      } else if (child.isText) {
        empty = !child.text?.trim();
      }

      return empty;
    });

    return empty;
  }

  /**
   * Iterates through the document to find all of the comments that exist as marks.
   *
   * @param doc Prosemirror document node
   * @returns Array<CommentMark>
   */
  static getComments(doc: Node): CommentMark[] {
    const comments: CommentMark[] = [];

    doc.descendants((node) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === "comment") {
          comments.push({
            ...mark.attrs,
            text: node.textContent,
          } as CommentMark);
        }
      });

      return true;
    });

    return comments;
  }

  /**
   * Builds the consolidated anchor text for the given comment-id.
   *
   * @param marks all available comment marks in a document.
   * @param commentId the comment-id to build the anchor text.
   * @returns consolidated anchor text.
   */
  static getAnchorTextForComment(
    marks: CommentMark[],
    commentId: string
  ): string | undefined {
    const anchorTexts = marks
      .filter((mark) => mark.id === commentId)
      .map((mark) => mark.text);

    return anchorTexts.length ? anchorTexts.join("") : undefined;
  }

  /**
   * Iterates through the document to find all of the images.
   *
   * @param doc Prosemirror document node
   * @returns Array<Node> of images
   */
  static getImages(doc: Node): Node[] {
    const images: Node[] = [];

    doc.descendants((node) => {
      if (node.type.name === "image") {
        images.push(node);
      }

      return true;
    });

    return images;
  }

  /**
   * Iterates through the document to find all of the tasks and their completion state.
   *
   * @param doc Prosemirror document node
   * @returns Array<Task>
   */
  static getTasks(doc: Node): Task[] {
    const tasks: Task[] = [];

    doc.descendants((node) => {
      if (!node.isBlock) {
        return false;
      }

      if (node.type.name === "checkbox_list") {
        node.content.forEach((listItem) => {
          let text = "";

          listItem.forEach((contentNode) => {
            if (contentNode.type.name === "paragraph") {
              text += contentNode.textContent;
            }
          });

          tasks.push({
            text,
            completed: listItem.attrs.checked,
          });
        });
      }

      return true;
    });

    return tasks;
  }

  /**
   * Returns a summary of total and completed tasks in the node.
   *
   * @param doc Prosemirror document node
   * @returns Object with completed and total keys
   */
  static getTasksSummary(doc: Node): { completed: number; total: number } {
    const tasks = ProsemirrorHelper.getTasks(doc);

    return {
      completed: tasks.filter((t) => t.completed).length,
      total: tasks.length,
    };
  }

  /**
   * Iterates through the document to find all of the headings and their level.
   *
   * @param doc Prosemirror document node
   * @param schema Prosemirror schema
   * @returns Array<Heading>
   */
  static getHeadings(doc: Node, schema: Schema) {
    const headings: Heading[] = [];
    const previouslySeen: Record<string, number> = {};

    doc.forEach((node) => {
      if (node.type.name === "heading") {
        // calculate the optimal id
        const id = headingToSlug(node);
        let name = id;

        // check if we've already used it, and if so how many times?
        // Make the new id based on that number ensuring that we have
        // unique ID's even when headings are identical
        if (previouslySeen[id] > 0) {
          name = headingToSlug(node, previouslySeen[id]);
        }

        // record that we've seen this id for the next loop
        previouslySeen[id] =
          previouslySeen[id] !== undefined ? previouslySeen[id] + 1 : 1;

        headings.push({
          title: ProsemirrorHelper.toPlainText(node, schema),
          level: node.attrs.level,
          id: name,
        });
      }
    });
    return headings;
  }

  /**
   * Replaces all template variables in the node.
   *
   * @param data The ProsemirrorData object to replace variables in
   * @param user The user to use for replacing variables
   * @returns The content with variables replaced
   */
  static replaceTemplateVariables(data: ProsemirrorData, user: User) {
    function replace(node: ProsemirrorData) {
      if (node.type === "text" && node.text) {
        node.text = TextHelper.replaceTemplateVariables(node.text, user);
      }

      if (node.content) {
        node.content.forEach(replace);
      }

      return node;
    }

    return replace(data);
  }
}
