import invariant from "invariant";
import { Document, Revision, User, Team } from "@server/models";
import { allow, _cannot as cannot } from "./cancan";

allow(User, "createDocument", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) {
    return false;
  }
  return true;
});

allow(User, ["read", "download"], Document, (user, document) => {
  if (!document) {
    return false;
  }

  // existence of collection option is not required here to account for share tokens
  if (document.collection && cannot(user, "read", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "star", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  if (document.template) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "read", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, "unstar", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.template) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "read", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, "share", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );

  if (cannot(user, "share", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "update", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }

  if (cannot(user, "update", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "createChildDocument", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  if (document.template) {
    return false;
  }
  if (!document.publishedAt) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, "move", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  if (!document.publishedAt) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, ["pin", "unpin"], Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  if (document.template) {
    return false;
  }
  if (!document.publishedAt) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, ["pinToHome"], Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  if (document.template) {
    return false;
  }
  if (!document.publishedAt) {
    return false;
  }

  return user.teamId === document.teamId && user.isAdmin;
});

allow(User, "delete", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  if (user.isViewer) {
    return false;
  }

  // allow deleting document without a collection
  if (document.collection && cannot(user, "update", document.collection)) {
    return false;
  }

  // unpublished drafts can always be deleted
  if (
    !document.deletedAt &&
    !document.publishedAt &&
    user.teamId === document.teamId
  ) {
    return true;
  }

  return user.teamId === document.teamId;
});

allow(User, "permanentDelete", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (!document.deletedAt) {
    return false;
  }
  if (user.isViewer) {
    return false;
  }

  // allow deleting document without a collection
  if (document.collection && cannot(user, "update", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "restore", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (!document.deletedAt) {
    return false;
  }
  if (user.isViewer) {
    return false;
  }

  if (document.collection && cannot(user, "update", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "archive", Document, (user, document) => {
  if (!document) {
    return false;
  }
  if (!document.publishedAt) {
    return false;
  }
  if (document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

allow(User, "unarchive", Document, (user, document) => {
  if (!document) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) {
    return false;
  }
  if (!document.archivedAt) {
    return false;
  }
  if (document.deletedAt) {
    return false;
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
  if (!document) {
    return false;
  }
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (!document.publishedAt || !!document.deletedAt || !!document.archivedAt) {
    return false;
  }
  if (cannot(user, "update", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});
