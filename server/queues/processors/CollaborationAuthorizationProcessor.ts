import AuthenticationExtension from "@server/collaboration/AuthenticationExtension";
import type {
  CollectionUserEvent,
  DocumentUserEvent,
  Event as TEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

/**
 * Collaboration connections are authorized once, when the websocket is first
 * established. This processor notifies collaboration servers whenever the
 * access a user was granted may have changed.
 */
export default class CollaborationAuthorizationProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = [
    "collections.add_user",
    "collections.remove_user",
    "collections.add_group",
    "collections.remove_group",
    "collections.permission_changed",
    "collections.archive",
    "collections.delete",
    "documents.add_user",
    "documents.remove_user",
    "documents.add_group",
    "documents.remove_group",
    "documents.move",
    "documents.unpublish",
    "groups.add_user",
    "groups.remove_user",
    "groups.delete",
    "users.demote",
    "users.suspend",
    "users.delete",
  ];

  async perform(event: TEvent) {
    switch (event.name) {
      // A membership was created, removed, or had its permission changed.
      case "collections.add_user":
      case "collections.remove_user":
        if (!this.affectsAccess(event)) {
          return;
        }
        return AuthenticationExtension.invalidate({
          userIds: [event.userId],
          collectionId: event.collectionId,
        });

      // A membership on a document is inherited by its published descendants,
      // which emit no events of their own, so the document is left out of the
      // scope rather than resolving the tree it applies to.
      case "documents.add_user":
      case "documents.remove_user":
        if (!this.affectsAccess(event)) {
          return;
        }
        return AuthenticationExtension.invalidate({
          userIds: [event.userId],
        });

      case "collections.add_group":
      case "collections.remove_group":
        return AuthenticationExtension.invalidate({
          groupId: event.modelId,
          collectionId: event.collectionId,
        });

      case "documents.add_group":
      case "documents.remove_group":
        return AuthenticationExtension.invalidate({
          groupId: event.modelId,
        });

      // Every membership derived from the group is gone, the users that were
      // members are resolved by the collaboration server.
      case "groups.delete":
        return AuthenticationExtension.invalidate({
          groupId: event.modelId,
        });

      case "groups.add_user":
      case "groups.remove_user":
        return AuthenticationExtension.invalidate({
          userIds: [event.userId],
        });

      // The collection a document inherits access from changed, which applies
      // to the moved document and all of its children.
      case "documents.move":
        return AuthenticationExtension.invalidate({
          documentIds: event.data.documentIds,
        });

      // A published document became a draft, visible only to its author.
      case "documents.unpublish":
        return AuthenticationExtension.invalidate({
          documentIds: [event.documentId],
        });

      // Access to every document in the collection may have changed.
      case "collections.permission_changed":
      case "collections.archive":
      case "collections.delete":
        return AuthenticationExtension.invalidate({
          collectionId: event.collectionId,
        });

      // The user's role or status changed, which applies to every document.
      case "users.demote":
      case "users.suspend":
      case "users.delete":
        return AuthenticationExtension.invalidate({
          userIds: [event.userId],
        });

      default:
        return;
    }
  }

  /**
   * User membership events are also emitted for changes that grant no access,
   * such as the index that orders a document in the sidebar.
   *
   * @param event The membership event to check.
   * @returns true if the event may have changed the user's access.
   */
  private affectsAccess(event: CollectionUserEvent | DocumentUserEvent) {
    // An existing membership only matters when the permission itself changed,
    // anything else is either a new or a removed membership. Removals carry no
    // data at all.
    if (event.data?.isNew === false) {
      return !!event.changes && "permission" in event.changes.attributes;
    }

    return true;
  }
}
