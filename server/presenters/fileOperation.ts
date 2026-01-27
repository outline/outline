import path from "node:path";
import type { FileOperation } from "@server/models";
import { presentUser } from ".";

export default function presentFileOperation(data: FileOperation) {
  return {
    id: data.id,
    type: data.type,
    format: data.format,
    name:
      data.collection?.name ||
      data.document?.titleWithDefault ||
      path.basename(data.key || ""),
    state: data.state,
    error: data.error,
    size: data.size,
    collectionId: data.collectionId,
    documentId: data.documentId,
    user: presentUser(data.user),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
