import type CollectionMergeRequest from "@server/models/CollectionMergeRequest";
import type { APIContext } from "@server/types";
import presentCollection from "./collection";
import presentUser from "./user";

export default async function presentCollectionMergeRequest(
  ctx: APIContext | undefined,
  mergeRequest: CollectionMergeRequest
) {
  const res: Record<string, any> = {
    id: mergeRequest.id,
    newCollectionName: mergeRequest.newCollectionName,
    sourceCollectionIds: mergeRequest.sourceCollectionIds,
    status: mergeRequest.status,
    approvals: mergeRequest.approvals,
    rejections: mergeRequest.rejections,
    createdAt: mergeRequest.createdAt,
    updatedAt: mergeRequest.updatedAt,
  };

  if (mergeRequest.targetCollection) {
    res.targetCollection = await presentCollection(
      ctx,
      mergeRequest.targetCollection
    );
  } else if (mergeRequest.targetCollectionId) {
    res.targetCollectionId = mergeRequest.targetCollectionId;
  }

  if (mergeRequest.requestedBy) {
    res.requestedBy = presentUser(mergeRequest.requestedBy);
  }

  return res;
}
