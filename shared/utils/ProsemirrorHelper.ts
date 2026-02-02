import type { Schema } from "prosemirror-model";
import { Node } from "prosemirror-model";
import headingToSlug from "../editor/lib/headingToSlug";
import textBetween from "../editor/lib/textBetween";
import type { ProsemirrorData } from "../types";
import { TextHelper } from "./TextHelper";
import env from "../env";
import { findChildren } from "@shared/editor/queries/findChildren";
import { isLightboxNode } from "@shared/editor/lib/Lightbox";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";

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

export type NodeAnchor = { pos: number; id: string; className: string };

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
  /\/api\/attachments\.redirect\?id=(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export const attachmentPublicRegex =
  /public\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export class ProsemirrorHelper {
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

  static isEmptyData(data: ProsemirrorData): boolean {
    if (data.type !== "doc") {
      return false;
    }

    if (data.content?.length === 1) {
      const node = data.content[0];
      return (
        node.type === "paragraph" &&
        (node.content === null ||
          node.content === undefined ||
          node.content.length === 0)
      );
    }

    return !data.content || data.content.length === 0;
  }

  static toPlainText(root: Node) {
    return textBetween(root, 0, root.content.size);
  }

  static trim(doc: Node) {
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
      isEmpty = ProsemirrorHelper.toPlainText(node).trim() === "";
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
      isEmpty = ProsemirrorHelper.toPlainText(node).trim() === "";
      if (isEmpty) {
        end -= node.nodeSize;
      }
    }

    return doc.cut(start, end);
  }

  static isEmpty(doc: Node, schema?: Schema) {
    if (!schema) {
      return !doc || doc.textContent.trim() === "";
    }

    let empty = true;
    doc.descendants((child: Node) => {
      if (!empty) {
        return false;
      }

      if (child.type.spec.leafText) {
        empty = !child.type.spec.leafText(child).trim();
      } else if (child.isText) {
        empty = !child.text?.trim();
      }

      return empty;
    });

    return empty;
  }

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

      (node.attrs.marks ?? []).forEach((mark: any) => {
        if (mark.type === "comment") {
          comments.push({
            ...mark.attrs,
            text: "",
          } as CommentMark);
        }
      });

      return true;
    });

    return comments;
  }

  private static getAnchorsForHeadingNodes(doc: Node): NodeAnchor[] {
    const previouslySeen: Record<string, number> = {};
    const anchors: NodeAnchor[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name !== "heading") {
        return;
      }

      const slug = headingToSlug(node);
      let id = slug;

      if (previouslySeen[slug] > 0) {
        id = headingToSlug(node, previouslySeen[slug]);
      }

      previouslySeen[slug] =
        previouslySeen[slug] !== undefined ? previouslySeen[slug] + 1 : 1;

      anchors.push({
        pos,
        id,
        className: EditorStyleHelper.headingPositionAnchor,
      });
    });
    return anchors;
  }

  private static getAnchorsForImageNodes(doc: Node): NodeAnchor[] {
    const anchors: NodeAnchor[] = [];
    doc.descendants((node, pos) => {
      if (Array.isArray(node.attrs?.marks)) {
        node.attrs.marks.forEach((mark: any) => {
          if (mark?.type === "comment" && mark?.attrs?.id) {
            anchors.push({
              pos,
              id: `comment-${mark.attrs.id}`,
              className: EditorStyleHelper.imagePositionAnchor,
            });
          }
        });
      }
    });

    return anchors;
  }

  static getAnchors(doc: Node): NodeAnchor[] {
    return [
      ...ProsemirrorHelper.getAnchorsForHeadingNodes(doc),
      ...ProsemirrorHelper.getAnchorsForImageNodes(doc),
    ];
  }

  static getAnchorTextForComment(
    marks: CommentMark[],
    commentId: string
  ): string | undefined {
    const anchorTexts = marks
      .filter((mark) => mark.id === commentId)
      .map((mark) => mark.text);

    return anchorTexts.length ? anchorTexts.join("") : undefined;
  }

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

  static getLightboxNodes(doc: Node) {
    return findChildren(doc, isLightboxNode, true);
  }

  static getVideos(doc: Node): Node[] {
    const videos: Node[] = [];

    doc.descendants((node) => {
      if (node.type.name === "video") {
        videos.push(node);
      }

      return true;
    });

    return videos;
  }

  static getAttachments(doc: Node): Node[] {
    const attachments: Node[] = [];

    doc.descendants((node) => {
      if (node.type.name === "attachment") {
        attachments.push(node);
      }

      return true;
    });

    return attachments;
  }

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

  static getTasksSummary(doc: Node): { completed: number; total: number } {
    const tasks = ProsemirrorHelper.getTasks(doc);

    return {
      completed: tasks.filter((t) => t.completed).length,
      total: tasks.length,
    };
  }

  static getHeadings(doc: Node) {
    const headings: Heading[] = [];
    const previouslySeen: Record<string, number> = {};

    doc.forEach((node) => {
      if (node.type.name === "heading") {
        const id = headingToSlug(node);
        let name = id;

        if (previouslySeen[id] > 0) {
          name = headingToSlug(node, previouslySeen[id]);
        }

        previouslySeen[id] =
          previouslySeen[id] !== undefined ? previouslySeen[id] + 1 : 1;

        headings.push({
          title: ProsemirrorHelper.toPlainText(node),
          level: node.attrs.level,
          id: name,
        });
      }
    });
    return headings;
  }

  static attachmentsToAbsoluteUrls(data: ProsemirrorData): ProsemirrorData {
    function replace(node: ProsemirrorData) {
      if (
        node.type === "image" &&
        node.attrs?.src &&
        String(node.attrs.src).match(
          new RegExp("^" + attachmentRedirectRegex.source)
        )
      ) {
        node.attrs.src = env.URL + node.attrs.src;
      }
      if (
        node.type === "video" &&
        node.attrs?.src &&
        String(node.attrs.src).match(
          new RegExp("^" + attachmentRedirectRegex.source)
        )
      ) {
        node.attrs.src = env.URL + node.attrs.src;
      }
      if (
        node.type === "attachment" &&
        node.attrs?.href &&
        String(node.attrs.src).match(
          new RegExp("^" + attachmentRedirectRegex.source)
        )
      ) {
        node.attrs.href = env.URL + node.attrs.href;
      }
      if (node.content) {
        node.content.forEach(replace);
      }

      return node;
    }

    return replace(data);
  }

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

  static getPlainParagraphs(data: ProsemirrorData | Node) {
    const jsonData =
      data instanceof Node ? (data.toJSON() as ProsemirrorData) : data;

    const paragraphs: ProsemirrorData[] = [];
    if (!jsonData.content) {
      return paragraphs;
    }

    for (const node of jsonData.content) {
      if (
        node.type === "paragraph" &&
        (!node.content ||
          !node.content.some(
            (item) =>
              item.type !== "text" || (item.marks && item.marks.length > 0)
          ))
      ) {
        paragraphs.push(node);
      } else {
        return undefined;
      }
    }
    return paragraphs;
  }

  static getHashtags(doc: Node): string[] {
    const hashtags = new Set<string>();

    doc.descendants((node) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === "hashtag") {
          hashtags.add(mark.attrs.tag);
        }
      });

      (node.attrs.marks ?? []).forEach((mark: any) => {
        if (mark.type === "hashtag") {
          hashtags.add(mark.attrs.tag);
        }
      });

      return true;
    });

    return Array.from(hashtags);
  }
}
