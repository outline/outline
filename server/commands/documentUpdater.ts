import { yDocToProsemirrorJSON } from "@getoutline/y-prosemirror";
import invariant from "invariant";
import { uniq } from "lodash";
import { Node } from "prosemirror-model";
import * as Y from "yjs";
import { schema, serializer } from "@server/editor";
import { Document, Event } from "@server/models";

export default async function documentUpdater({
  documentId,
  ydoc,
  userId,
}: {
  documentId: string;
  ydoc: Y.Doc;
  userId?: string;
}) {
  const document = await Document.scope("withState").findByPk(documentId);
  invariant(document, "document not found");

  const state = Y.encodeStateAsUpdate(ydoc);
  const node = Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));
  const text = serializer.serialize(node, undefined);
  const isUnchanged = document.text === text;
  const hasMultiplayerState = !!document.state;

  if (isUnchanged && hasMultiplayerState) {
    return;
  }

  // extract collaborators from doc user data
  const pud = new Y.PermanentUserData(ydoc);
  const pudIds = Array.from(pud.clients.values());
  const existingIds = document.collaboratorIds;
  const collaboratorIds = uniq([...pudIds, ...existingIds]);

  await Document.scope(["withDrafts", "withState"]).update(
    {
      text,
      state: Buffer.from(state),
      updatedAt: isUnchanged ? document.updatedAt : new Date(),
      lastModifiedById:
        isUnchanged || !userId ? document.lastModifiedById : userId,
      collaboratorIds,
    },
    {
      silent: true,
      hooks: false,
      where: {
        id: documentId,
      },
    }
  );

  if (isUnchanged) {
    return;
  }

  await Event.schedule({
    name: "documents.update",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: userId,
    data: {
      multiplayer: true,
      title: document.title,
    },
  });
}
