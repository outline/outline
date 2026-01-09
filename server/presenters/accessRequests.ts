import { AccessRequest } from "@server/models";
import presentUser from "./user";

export default function present(accessRequest: AccessRequest) {
  return {
    id: accessRequest.id,
    documentId: accessRequest.documentId,
    userId: accessRequest.userId,
    user: accessRequest.user ? presentUser(accessRequest.user) : undefined,
    teamId: accessRequest.teamId,
    status: accessRequest.status,
    responderId: accessRequest.responderId,
    responder: accessRequest.responder
      ? presentUser(accessRequest.responder)
      : undefined,
    respondedAt: accessRequest.respondedAt,
    createdAt: accessRequest.createdAt,
    updatedAt: accessRequest.updatedAt,
  };
}
