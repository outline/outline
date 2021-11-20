import { Event } from "@server/models";
import presentUser from "./user";

export default function present(event: Event, isAdmin = false) {
  const data = {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Event'.
    id: event.id,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'Event'.
    name: event.name,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'modelId' does not exist on type 'Event'.
    modelId: event.modelId,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'actorId' does not exist on type 'Event'.
    actorId: event.actorId,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'ip' does not exist on type 'Event'.
    actorIpAddress: event.ip,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Ev... Remove this comment to see the full error message
    collectionId: event.collectionId,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'documentId' does not exist on type 'Even... Remove this comment to see the full error message
    documentId: event.documentId,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'Event... Remove this comment to see the full error message
    createdAt: event.createdAt,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'data' does not exist on type 'Event'.
    data: event.data,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'actor' does not exist on type 'Event'.
    actor: presentUser(event.actor),
  };

  if (!isAdmin) {
    delete data.actorIpAddress;
  }

  return data;
}
