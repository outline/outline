// @flow
import invariant from "invariant";
import { Document, Revision, User, Team } from "../models";
import policy from "./policy";

const { allow, cannot } = policy;

allow(User, "createDocument", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return true;
});

allow(User, ["read", "download"], Document, (user, document) => {
  // existence of collection option is not required here to account for share tokens
  if (document.collection && cannot(user, "read", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, ["star", "unstar"], Document, (user, document) => {
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;
  if (document.template) return false;
  if (!document.publishedAt) return false;

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "read", document.collection)) return false;

  return user.teamId === document.teamId;
});

allow(User, "share", Document, (user, document) => {
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;

  if (cannot(user, "share", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "update", Document, (user, document) => {
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;

  if (cannot(user, "update", document.collection)) {
    return false;
  }

  return user.teamId === document.teamId;
});

allow(User, "createChildDocument", Document, (user, document) => {
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;
  if (document.template) return false;
  if (!document.publishedAt) return false;

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) return false;

  return user.teamId === document.teamId;
});

allow(User, "move", Document, (user, document) => {
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;
  if (!document.publishedAt) return false;

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) return false;

  return user.teamId === document.teamId;
});

allow(User, ["pin", "unpin"], Document, (user, document) => {
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;
  if (document.template) return false;
  if (!document.publishedAt) return false;

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) return false;

  return user.teamId === document.teamId;
});

allow(User, "delete", Document, (user, document) => {
  // unpublished drafts can always be deleted
  if (user.isViewer) return false;
  if (
    !document.deletedAt &&
    !document.publishedAt &&
    user.teamId === document.teamId
  ) {
    return true;
  }

  // allow deleting document without a collection
  if (document.collection && cannot(user, "update", document.collection)) {
    return false;
  }

  if (document.deletedAt) return false;

  return user.teamId === document.teamId;
});

allow(User, "restore", Document, (user, document) => {
  if (user.isViewer) return false;
  if (!document.deletedAt) return false;
  return user.teamId === document.teamId;
});

allow(User, "archive", Document, (user, document) => {
  if (!document.publishedAt) return false;
  if (document.archivedAt) return false;
  if (document.deletedAt) return false;

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) return false;

  return user.teamId === document.teamId;
});

allow(User, "unarchive", Document, (user, document) => {
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "update", document.collection)) return false;

  if (!document.archivedAt) return false;

  return user.teamId === document.teamId;
});

allow(
  Document,
  "restore",
  Revision,
  (document, revision) => document.id === revision.documentId
);

allow(User, "unpublish", Document, (user, document) => {
  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );

  if (!document.publishedAt || !!document.deletedAt || !!document.archivedAt)
    return false;

  if (cannot(user, "update", document.collection)) return false;

  const documentID = document.id;
  const hasChild = (documents) =>
    documents.some((doc) => {
      if (doc.id === documentID) return doc.children.length > 0;
      return hasChild(doc.children);
    });

  return (
    !hasChild(document.collection.documentStructure) &&
    user.teamId === document.teamId
  );
});
