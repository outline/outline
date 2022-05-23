import { Transaction } from "sequelize";
import { APM } from "@server/logging/tracing";
import { Collection, Event, Team, User, FileOperation } from "@server/models";
import {
  FileOperationType,
  FileOperationState,
  FileOperationFormat,
} from "@server/models/FileOperation";
import { getAWSKeyForFileOp } from "@server/utils/s3";

async function collectionExporter({
  collection,
  team,
  user,
  ip,
  transaction,
}: {
  collection?: Collection;
  team: Team;
  user: User;
  ip: string;
  transaction: Transaction;
}) {
  const collectionId = collection?.id;
  const key = getAWSKeyForFileOp(user.teamId, collection?.name || team.name);
  const fileOperation = await FileOperation.create(
    {
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
      format: FileOperationFormat.MarkdownZip,
      key,
      url: null,
      size: 0,
      collectionId,
      userId: user.id,
      teamId: user.teamId,
    },
    {
      transaction,
    }
  );

  await Event.create(
    {
      name: "fileOperations.create",
      teamId: user.teamId,
      actorId: user.id,
      modelId: fileOperation.id,
      collectionId,
      ip,
      data: {
        type: FileOperationType.Import,
      },
    },
    {
      transaction,
    }
  );

  fileOperation.user = user;

  if (collection) {
    fileOperation.collection = collection;
  }

  return fileOperation;
}

export default APM.traceFunction({
  serviceName: "command",
  spanName: "collectionExporter",
})(collectionExporter);
