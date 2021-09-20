// @flow
import { Collection, Event, Team, User, FileOperation } from "../models";
import { getAWSKeyForFileOp } from "../utils/s3";

export default async function collectionExporter({
  collection,
  team,
  user,
  ip,
}: {
  collection?: Collection,
  team: Team,
  user: User,
  ip: string,
}) {
  const collectionId = collection?.id;
  const key = getAWSKeyForFileOp(user.teamId, collection?.name || team.name);

  const fileOperation = await FileOperation.create({
    type: "export",
    state: "creating",
    key,
    url: null,
    size: 0,
    collectionId,
    userId: user.id,
    teamId: user.teamId,
  });

  // Event is consumed on worker in queues/processors/exports
  await Event.create({
    name: collection ? "collections.export" : "collections.export_all",
    collectionId,
    teamId: user.teamId,
    actorId: user.id,
    modelId: fileOperation.id,
    ip,
  });

  fileOperation.user = user;
  fileOperation.collection = collection;

  return fileOperation;
}
