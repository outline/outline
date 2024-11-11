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
  ctx: APIContext;
};

function getKeyForFileOp(
  teamId: string,
  format: FileOperationFormat,
  name: string
) {
  return `${
    Buckets.uploads
  }/${teamId}/${uuidv4()}/${name}-export.${format.replace(/outline-/, "")}.zip`;
}

async function collectionExporter({
  collection,
  team,
  user,
  format = FileOperationFormat.MarkdownZip,
  includeAttachments = true,
  ctx,
}: Props) {
  const collectionId = collection?.id;
  const key = getKeyForFileOp(
    user.teamId,
    format,
    collection?.name || team.name
  );
  const fileOperation = await FileOperation.createWithCtx(ctx, {
    type: FileOperationType.Export,
    state: FileOperationState.Creating,
    format,
    key,
    url: null,
    size: 0,
    collectionId,
    options: {
      includeAttachments,
    },
    userId: user.id,
    teamId: user.teamId,
  });

  fileOperation.user = user;

  if (collection) {
    fileOperation.collection = collection;
  }

  return fileOperation;
}

export default traceFunction({
  spanName: "collectionExporter",
})(collectionExporter);
