import { Document } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import {
  MentionType,
  ProsemirrorDoc,
} from "@shared/types";
import { Fragment, Node } from "prosemirror-model";
import { schema } from "@server/editor";
import { v4 as uuidv4 } from "uuid";

/**
 * Transform the mentions and attachments in ProseMirrorDoc to their internal references.
 *
 * @param content ProseMirrorDoc that represents collection (or) document content.
 * @returns Updated ProseMirrorDoc.
 */
export default async function importMentions({
  content,
}: {
  content: ProsemirrorDoc;
}): Promise<ProsemirrorDoc> {
  // special case when the doc content is empty.
  if (!content.content.length) {
    return content;
  }

  const doc = ProsemirrorHelper.toProsemirror(content);

  return doc.copy(await transformMentionsFragment(doc.content)).toJSON();
}

async function transformMentionsFragment(fragment: Fragment|Node): Promise<Fragment> {
  const transformImportedMentionNode = async (node: Node): Promise<Node> => {
    const modelId = node.text && node.text.match(/mention:([a-f0-9\-]+)/)?.[1];

    if (modelId) {
      const doc = await Document.findOne({
        where: {
        id: modelId,
        },
      });
      if (doc) {
        const newNode =  schema.nodes.mention.create({
          type: MentionType.Document,
          modelId,
          label: doc.titleWithDefault,
          id: uuidv4(),
          });
        
        return newNode;
      }
    }
    console.log("documentCreator:updatedMentionsAndAttachments: doc not found", modelId);
    return node;
  };

  const transformFragment = async (fragment: Fragment|Node): Promise<Fragment> => {
    const nodePromises: Promise<Node>[] = [];

    fragment.forEach((node) => {
      if (node.type.name === "text" && node.text && node.text.search(/mention:[a-f0-9\-]+/) == 0) {
        nodePromises.push(transformImportedMentionNode(node));
      } else {
        nodePromises.push(
          transformFragment(node.content).then((transformedContent) =>
            node.copy(transformedContent)
          )
        );
      }
    });

    const nodes = await Promise.all(nodePromises);
    return Fragment.fromArray(nodes);
  };
  return await transformFragment(fragment);
}

export {
  transformMentionsFragment,
};
