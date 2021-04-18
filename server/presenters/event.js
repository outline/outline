// @flow
import { Event } from "../models";
import presentUser from "./user";

export default function present(event: Event, isAdmin: boolean = false) {
  let data = {
    id: event.id,
    name: event.name,
    modelId: event.modelId,
    actorId: event.actorId,
    actorIpAddress: event.ip,
    collectionId: event.collectionId,
    documentId: event.documentId,
    createdAt: event.createdAt,
    data: event.data,
    actor: presentUser(event.actor),
  };

  if (!isAdmin) {
    delete data.actorIpAddress;
  }

  return data;
}
