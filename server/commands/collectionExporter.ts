import { Transaction } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import {
  FileOperationFormat,
  FileOperationType,
  FileOperationState,
} from "@shared/types";
import { traceFunction } from "@server/logging/tracing";
import { Collection, Event, Team, User, FileOperation } from "@server/models";

type Props = {
  collection?: Collection;
  team: Team;
  user: User;
  format?: FileOperationFormat;
  includeAttachments?: boolean;
  ip: string;
  transaction: Transaction;
};

function getKeyForFileOp(teamId: string, name: string) {
  const bucket = "uploads";
  return `${bucket}/${teamId}/${uuidv4()}/${name}-export.zip`;
}

async function collectionExporter({
  collection,
  team,
  user,
  format = FileOperationFormat.MarkdownZip,
  includeAttachments = true,
  ip,
  transaction,
}: Props) {
  const collectionId = collection?.id;
  const key = getKeyForFileOp(user.teamId, collection?.name || team.name);
  const fileOperation = await FileOperation.create(
    {
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
      format,
      key,
      url: null,
      size: 0,
      collectionId,
      includeAttachments,
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
        type: FileOperationType.Export,
        format,
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

export default traceFunction({
  spanName: "collectionExporter",
})(collectionExporter);
