import { Collection, Event, Team, User, FileOperation } from "../models";
import { getAWSKeyForFileOp } from "../utils/s3";

export default async function collectionExporter({
  collection,
  team,
  user,
  ip,
}: {
  // @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
  collection?: Collection;
  // @ts-expect-error ts-migrate(2749) FIXME: 'Team' refers to a value, but is being used as a t... Remove this comment to see the full error message
  team: Team;
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User;
  ip: string;
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
