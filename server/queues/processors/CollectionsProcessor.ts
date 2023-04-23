import { CollectionEvent, Event } from "@server/types";
import DetachDraftsFromCollectionTask from "../tasks/DetachDraftsFromCollectionTask";
import BaseProcessor from "./BaseProcessor";

export default class CollectionsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["collections.delete"];

  async perform(event: CollectionEvent) {
    switch (event.name) {
      case "collections.delete":
        return this.collectionDeleted(event);
      default:
    }
  }

  async collectionDeleted(event: CollectionEvent) {
    await DetachDraftsFromCollectionTask.schedule({
      collectionId: event.collectionId,
      actorId: event.actorId,
      ip: event.ip,
    });
  }
}
