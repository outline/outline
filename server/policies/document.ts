import invariant from "invariant";
import some from "lodash/some";
import {
  CollectionPermission,
  DocumentPermission,
  TeamPreference,
} from "@shared/types";
import { Document, Revision, User, Team } from "@server/models";
import { allow, _cannot as cannot, _can as can } from "./cancan";

allow(User, "createDocument", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(User, "read", Document, (user, document) => {
  if (!document) {
    return false;
  }

  if (
    includesMembership(document, [
      DocumentPermission.Read,
      DocumentPermission.ReadWrite,
    ])
  ) {
    return true;
  }

  // existence of collection option is not required here to account for share tokens
  if (
    document.collection &&
    cannot(user, "readDocument", document.collection)
  ) {
    return false;
  }

  if (document.isDraft) {
    return user.id === document.createdById;
  }

  return user.teamId === document.teamId;
});

allow(User, "download", Document, (user, document) => {
  if (!document) {
    return false;
  }

  if (
    user.isViewer &&
    !user.team.getPreference(TeamPreference.ViewersCanExport)
  ) {
    return false;
  }

  if (
    includesMembership(document, [
      DocumentPermission.Read,
      DocumentPermission.ReadWrite,
    ])
  ) {
    return true;
  }

  // existence of collection option is not required here to account for share tokens
  if (
    document.collection &&
    cannot(user, "readDocument", document.collection)
  ) {
    return false;
  }

  if (document.isDraft) {
    return user.id === document.createdById;
  }

  return user.teamId === document.teamId;
});

allow(User, "comment", Document, (user, document) => {
  if (!document || !document.isActive || document.template) {
    return false;
  }

  if (
    includesMembership(document, [
      DocumentPermission.Read,
      DocumentPermission.ReadWrite,
    ])
  ) {
    return true;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (can(user, "readDocument", document.collection)) {
      return true;
    }
  }

  return user.id === document.createdById;
});

allow(User, ["star", "unstar"], Document, (user, document) => {
  if (!document || !document.isActive || document.template) {
    return false;
  }

  if (
    includesMembership(document, [
      DocumentPermission.Read,
      DocumentPermission.ReadWrite,
    ])
  ) {
    return true;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (cannot(user, "readDocument", document.collection)) {
      return false;
    }
  }

  return user.teamId === document.teamId;
});

allow(User, "share", Document, (user, document) => {
  if (
    !document ||
    document.archivedAt ||
    document.deletedAt ||
    document.template
  ) {
    return false;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (cannot(user, "share", document.collection)) {
      return false;
    }
  }

  if (document.isDraft) {
    return user.id === document.createdById;
  }

  return user.teamId === document.teamId;
});

allow(User, "update", Document, (user, document) => {
  if (!document || !document.isActive) {
    return false;
  }

  if (includesMembership(document, [DocumentPermission.ReadWrite])) {
    return true;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (cannot(user, "updateDocument", document.collection)) {
      return false;
    }
  }

  if (document.isDraft) {
    return user.id === document.createdById;
  }

  return user.teamId === document.teamId;
});

allow(User, "publish", Document, (user, document) => {
  if (!document || !document.isActive || !document.isDraft) {
    return false;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (can(user, "updateDocument", document.collection)) {
      return true;
    }
  }

  return user.id === document.createdById;
});

allow(User, ["manageUsers", "duplicate"], Document, (user, document) => {
  if (!document || !document.isActive) {
    return false;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (can(user, "updateDocument", document.collection)) {
      return true;
    }
  }

  return user.id === document.createdById;
});

allow(User, "updateInsights", Document, (user, document) => {
  if (!document || !document.isActive) {
    return false;
  }

  if (document.collectionId) {
    invariant(
      document.collection,
      "collection is missing, did you forget to include in the query scope?"
    );
    if (can(user, "update", document.collection)) {
      return true;
    }
  }

  return user.id === document.createdById;
});

allow(User, "createChildDocument", Document, (user, document) => {
  if (
    !document ||
    !document.isActive ||
    document.isDraft ||
    document.template
  ) {
    return false;
  }

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (can(user, "updateDocument", document.collection)) {
    return true;
  }
  return user.id === document.createdById;
});

allow(User, "move", Document, (user, document) => {
  if (!document || !document.isActive) {
    return false;
  }
  if (document.collection && can(user, "updateDocument", document.collection)) {
    return true;
  }
  return user.id === document.createdById;
});

allow(User, "pin", Document, (user, document) => {
  if (
    !document ||
    !document.isActive ||
    document.isDraft ||
    document.template
  ) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (can(user, "update", document.collection)) {
    return true;
  }
  return user.id === document.createdById;
});

allow(User, "unpin", Document, (user, document) => {
  if (!document || document.isDraft || document.template) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (can(user, "update", document.collection)) {
    return true;
  }
  return user.id === document.createdById;
});

allow(User, ["subscribe", "unsubscribe"], Document, (user, document) => {
  if (
    !document ||
    !document.isActive ||
    document.isDraft ||
    document.template
  ) {
    return false;
  }

  if (
    includesMembership(document, [
      DocumentPermission.Read,
      DocumentPermission.ReadWrite,
    ])
  ) {
    return true;
  }

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (can(user, "readDocument", document.collection)) {
    return true;
  }

  return user.id === document.createdById;
});

allow(User, "pinToHome", Document, (user, document) => {
  if (
    !document ||
    !document.isActive ||
    document.isDraft ||
    document.template
  ) {
    return false;
  }

  return user.teamId === document.teamId && user.isAdmin;
});

allow(User, "delete", Document, (user, document) => {
  if (!document || document.deletedAt || user.isViewer) {
    return false;
  }

  // allow deleting document without a collection
  if (
    document.collection &&
    cannot(user, "deleteDocument", document.collection)
  ) {
    return false;
  }

  // unpublished drafts can always be deleted by their owner
  if (document.isDraft) {
    return user.id === document.createdById;
  }

  return user.teamId === document.teamId;
});

allow(User, "permanentDelete", Document, (user, document) => {
  if (!document || !document.deletedAt || user.isViewer) {
    return false;
  }

  // allow deleting document without a collection
  if (
    document.collection &&
    cannot(user, "updateDocument", document.collection)
  ) {
    return false;
  }

  // unpublished drafts can always be deleted by their owner
  if (document.isDraft && user.id === document.createdById) {
    return true;
  }

  return user.teamId === document.teamId && user.isAdmin;
});

allow(User, "restore", Document, (user, document) => {
  if (!document || !document.deletedAt) {
    return false;
  }

  if (
    document.collection &&
    cannot(user, "updateDocument", document.collection)
  ) {
    return false;
  }

  // unpublished drafts can always be restored by their owner
  if (document.isDraft && user.id === document.createdById) {
    return true;
  }

  return user.teamId === document.teamId;
});

allow(User, "archive", Document, (user, document) => {
  if (
    !document ||
    !document.isActive ||
    document.isDraft ||
    document.template
  ) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "updateDocument", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, "unarchive", Document, (user, document) => {
  if (!document || !document.archivedAt || document.deletedAt) {
    return false;
  }

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "updateDocument", document.collection)) {
    return false;
  }

  if (document.isDraft) {
    return user.id === document.createdById;
  }

  return user.teamId === document.teamId;
});

allow(
  Document,
  "restore",
  Revision,
  (document, revision) => document.id === revision?.documentId
);

allow(User, "unpublish", Document, (user, document) => {
  if (!document || !document.isActive || document.isDraft || user.isViewer) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "updateDocument", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

function includesMembership(
  document: Document,
  permissions: (DocumentPermission | CollectionPermission)[]
) {
  invariant(
    document.memberships,
    "document memberships should be preloaded, did you forget withMembership scope?"
  );
  return some(document.memberships, (m) => permissions.includes(m.permission));
}
