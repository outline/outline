// @flow
import { yDocToProsemirror } from "@tommoor/y-prosemirror";
import { uniq } from "lodash";
import { schema, serializer } from "rich-markdown-editor";
import * as Y from "yjs";
import { Document, Event } from "../models";

export default async function documentUpdater({
  document,
  ydoc,
  userId,
  done,
}: {
  document: Document,
  ydoc: Y.Doc,
  userId: string,
  done?: boolean,
}) {
  const state = Y.encodeStateAsUpdate(ydoc);
  const node = yDocToProsemirror(schema, ydoc);
  const text = serializer.serialize(node);

  // extract collaborators from doc user data
  const pud = new Y.PermanentUserData(ydoc);
  const pudIds = Array.from(pud.clients.values());
  const existingIds = document.collaboratorIds;
  const collaboratorIds = uniq([...pudIds, ...existingIds]);

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
