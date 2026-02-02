import "./bootstrap";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import type { ProsemirrorData } from "@shared/types";
import normalizeHashtags from "@shared/editor/lib/normalizeHashtags";
import { schema, serializer } from "@server/editor";
import { Document, Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";

const limit = 100;
const page = 0;

/**
 * Normalize stored hashtag content for documents and revisions.
 *
 * @param exit Whether to exit the process when complete.
 */
export default async function main(exit = false) {
    const work = async (page: number): Promise<void> => {
        console.log(`Normalize hashtags… page ${page}`);

        const documents = await Document.unscoped().findAll({
            attributes: ["id", "content", "text", "state"],
            limit,
            offset: page * limit,
            order: [["createdAt", "ASC"]],
            paranoid: false,
        });

        for (const document of documents) {
            const node = DocumentHelper.toProsemirror(document);
            const normalizedNode = normalizeHashtags(node, schema);

            if (normalizedNode.eq(node)) {
                continue;
            }

            document.content = normalizedNode.toJSON() as ProsemirrorData;
            document.text = serializer.serialize(normalizedNode);

            if (document.state) {
                const ydoc = prosemirrorToYDoc(normalizedNode, "default");
                const state = Y.encodeStateAsUpdate(ydoc);
                document.state = Buffer.from(state);
                document.changed("state", true);
            }

            document.changed("content", true);

            await document.save({
                hooks: false,
                silent: true,
            });
        }

        const revisions = await Revision.unscoped().findAll({
            attributes: ["id", "content", "text"],
            limit,
            offset: page * limit,
            order: [["createdAt", "ASC"]],
            paranoid: false,
        });

        for (const revision of revisions) {
            if (!revision.content && !revision.text) {
                continue;
            }

            const node = DocumentHelper.toProsemirror(revision);
            const normalizedNode = normalizeHashtags(node, schema);

            if (normalizedNode.eq(node)) {
                continue;
            }

            revision.content = normalizedNode.toJSON() as ProsemirrorData;
            revision.text = serializer.serialize(normalizedNode);
            revision.changed("content", true);
            revision.changed("text", true);

            await revision.save({
                hooks: false,
                silent: true,
            });
        }

        return documents.length === limit || revisions.length === limit
            ? work(page + 1)
            : undefined;
    };

    await work(page);

    if (exit) {
        console.log("Normalization complete");
        process.exit(0);
    }
}

if (process.env.NODE_ENV !== "test") {
    void main(true);
}
