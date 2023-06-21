import { Transaction } from "sequelize";
import {
  FileOperationFormat,
  FileOperationType,
  FileOperationState,
} from "@shared/types";
import { traceFunction } from "@server/logging/tracing";
import { Collection, Event, Team, User, FileOperation } from "@server/models";
import { getAWSKeyForFileOp } from "@server/utils/s3";

type Props = {
  collection?: Collection;
  team: Team;
  user: User;
  format?: FileOperationFormat;
  includeAttachments?: boolean;
  ip: string;
  transaction: Transaction;
};

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
  const key = getAWSKeyForFileOp(user.teamId, collection?.name || team.name);
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
