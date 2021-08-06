// @flow
import { uniq } from "lodash";
import { schema, serializer } from "rich-markdown-editor";
import { yDocToProsemirror } from "y-prosemirror";
import * as Y from "yjs";
import { Document, Event } from "../models";

export default async function documentUpdater({
  documentId,
  ydoc,
  userId,
  done,
}: {
  documentId: string,
  ydoc: Y.Doc,
  userId: string,
  done?: boolean,
}) {
  const document = await Document.findByPk(documentId);
  const state = Y.encodeStateAsUpdate(ydoc);
  const node = yDocToProsemirror(schema, ydoc);
  const text = serializer.serialize(node);

  // extract collaborators from doc user data
  const pud = new Y.PermanentUserData(ydoc);
  const pudIds = Array.from(pud.clients.values());
  const existingIds = document.collaboratorIds;
  const collaboratorIds = uniq([...pudIds, ...existingIds]);

  if (document.text === text) {
    return;
  }

  await Document.update(
    {
      text,
      state: Buffer.from(state),
      updatedAt: new Date(),
      lastModifiedById: userId,
      collaboratorIds,
    },
    {
      hooks: false,
      where: {
        id: document.id,
      },
    }
  );

  const event = {
    name: "documents.update",
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: userId,
    data: {
      multiplayer: true,
      title: document.title,
    },
  };

  if (done) {
    await Event.create(event);
  } else {
    await Event.add(event);
  }
}
