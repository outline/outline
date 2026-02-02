import { Buffer } from "buffer";
import debounce from "lodash/debounce";
import { prosemirrorToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import { CollectionValidation } from "@shared/validations";
import { traceFunction } from "@server/logging/tracing";
import Collection from "@server/models/Collection";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import Logger from "@server/logging/Logger";
import type { ProsemirrorData } from "@shared/types";

type Props = {
    collectionId: string;
    ydoc: Y.Doc;
};

const DEBOUNCE_DELAY = 2000;

class CollectionCollaborativeUpdater {
    collections: Record<
        string,
        ReturnType<typeof debounce>
    > = {};

    public update = async (props: Props) => {
        let updater = this.collections[props.collectionId];

        if (!updater) {
            updater = debounce(this.saveCollection, DEBOUNCE_DELAY);
            this.collections[props.collectionId] = updater;
        }

        // Always update value immediately in DB for YJS state to be in sync across nodes
        // but debounce the heavy markdown/JSON generation
        await this.saveState(props);
        await updater(props);
    };

    private saveState = async ({ collectionId, ydoc }: Props) => {
        let state = Y.encodeStateAsUpdate(ydoc);

        // Auto-compaction: if state size exceeds threshold, flatten to remove history
        // Using CollectionValidation.maxDescriptionLength as a proxy for state size limit
        // Collections don't have a specific maxStateLength, so we use a reasonable threshold
        const AUTO_COMPACT_THRESHOLD = 1200 * 1024; // 1.2MB, same as documents
        if (state.length > AUTO_COMPACT_THRESHOLD) {
            Logger.warn(
                `Collection state exceeds threshold, performing auto-compaction`,
                {
                    collectionId,
                    beforeSize: state.length,
                    threshold: AUTO_COMPACT_THRESHOLD,
                }
            );

            try {
                // Create fresh Y.Doc from current content without history
                const content = yDocToProsemirrorJSON(ydoc, "default") as ProsemirrorData;
                const prosemirrorNode = ProsemirrorHelper.toProsemirror(content);
                const compactedYdoc = prosemirrorToYDoc(prosemirrorNode, "default");
                const compactedState = Y.encodeStateAsUpdate(compactedYdoc);

                Logger.info(
                    "multiplayer",
                    `Collection auto-compaction completed successfully`,
                    {
                        collectionId,
                        beforeSize: state.length,
                        afterSize: compactedState.length,
                        reduction: state.length - compactedState.length,
                    }
                );

                // Use compacted state
                state = compactedState;
            } catch (err) {
                Logger.error(
                    "Failed to perform collection auto-compaction, using original state",
                    err,
                    {
                        collectionId,
                        stateSize: state.length,
                    }
                );
                // Continue with original state if compaction fails
            }
        }

        await Collection.update(
            {
                state: Buffer.from(state),
            },
            {
                where: {
                    id: collectionId,
                },
                silent: true,
                hooks: false,
            }
        );
    };

    private saveCollection = async ({ collectionId, ydoc }: Props) => {
        try {
            const transaction = await sequelize.transaction();
            const collection = await Collection.findByPk(collectionId, {
                rejectOnEmpty: true,
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            const prosemirror = yDocToProsemirrorJSON(ydoc, "default") as ProsemirrorData;
            // toMarkdown expects a Document/Collection/ProsemirrorData.
            // We pass the ProsemirrorData directly.
            const description = await DocumentHelper.toMarkdown(prosemirror, {
                includeTitle: false,
            });

            await collection.update(
                {
                    content: prosemirror,
                    description,
                },
                {
                    transaction,
                    silent: true,
                }
            );

            await transaction.commit();

            // Cleanup
            delete this.collections[collectionId];
        } catch (err) {
            Logger.error("Failed to save collection collaborative update", err, {
                collectionId,
            });
        }
    };
}

const updater = new CollectionCollaborativeUpdater();

export default traceFunction({
    spanName: "collectionCollaborativeUpdater",
})(updater.update);
