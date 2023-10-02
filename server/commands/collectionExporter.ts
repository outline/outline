import { v4 as uuidv4 } from "uuid";
import {
  FileOperationFormat,
  FileOperationType,
  FileOperationState,
} from "@shared/types";
import { traceFunction } from "@server/logging/tracing";
import { Collection, Team, User, FileOperation } from "@server/models";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import { type APIContext } from "@server/types";

type Props = {
  collection?: Collection;
  team: Team;
  user: User;
  format?: FileOperationFormat;
  includeAttachments?: boolean;
  context: APIContext["context"];
};

function getKeyForFileOp(teamId: string, name: string) {
  return `${Buckets.uploads}/${teamId}/${uuidv4()}/${name}-export.zip`;
}

async function collectionExporter({
  collection,
  team,
  user,
  format = FileOperationFormat.MarkdownZip,
  includeAttachments = true,
  context,
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
    context
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
