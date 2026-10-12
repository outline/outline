import invariant from "invariant";
import {
  CommentingAccess,
  DocumentPermission,
  TeamPreference,
} from "@shared/types";
import { Document, Revision, User, Team } from "@server/models";
import { allow, cannot, can } from "./cancan";
import {
  and,
  isCollectionOwner,
  isCollectionWritable,
  isTeamAdmin,
  isTeamModel,
  isTeamMutable,
  or,
} from "./utils";

allow(User, "createDocument", Team, (actor, document) =>
  and(
    //
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, document),
    isTeamMutable(actor)
  )
);

allow(User, "read", Document, (actor, document) =>
  and(
    isTeamModel(actor, document),
    or(
      includesMembership(document, [
        DocumentPermission.Read,
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      and(!!document?.isDraft, actor.id === document?.createdById),
      can(actor, "readDocument", document?.collection)
    )
  )
);

allow(User, ["listRevisions", "listViews"], Document, (actor, document) =>
  or(
    and(!actor.isGuest, can(actor, "read", document)),
    and(actor.isGuest, can(actor, "update", document))
  )
);

allow(User, "download", Document, (actor, document) =>
  and(
    can(actor, "read", document),
    or(
      and(!actor.isGuest, !actor.isViewer),
      !!actor.team.getPreference(TeamPreference.ViewersCanExport)
    )
  )
);

allow(User, "comment", Document, (actor, document) => {
  const commenting = actor.team.getPreference(TeamPreference.Commenting);
  return and(
    !!document?.isActive,
    isTeamMutable(actor),
    can(actor, "read", document),
    // A legacy boolean `false` (team not yet migrated) means disabled.
    commenting !== CommentingAccess.None && commenting !== false,
    or(!actor.isGuest, commenting === CommentingAccess.Everyone),
    or(!document?.collection, document?.collection?.commenting !== false)
  );
});

allow(
  User,
  ["star", "unstar", "subscribe", "unsubscribe"],
  Document,
  (actor, document) =>
    and(
      //
      can(actor, "read", document)
    )
);

allow(User, "share", Document, (actor, document) =>
  and(
    !!document?.isActive,
    isTeamMutable(actor),
    can(actor, "read", document),
    or(!document?.collection, can(actor, "shareDocument", document?.collection))
  )
);

allow(User, "update", Document, (actor, document) =>
  and(
    !!document?.isActive,
    isTeamMutable(actor),
    can(actor, "read", document),
    isCollectionWritable(actor, document?.collection),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      or(
        can(actor, "updateDocument", document?.collection),
        and(!!document?.isDraft && actor.id === document?.createdById)
      )
    )
  )
);

allow(User, "publish", Document, (actor, document) =>
  and(
    //
    !!document?.isDraft,
    can(actor, "update", document)
  )
);

allow(User, "manageUsers", Document, (actor, document) =>
  and(
    isTeamMutable(actor),
    can(actor, "read", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      isTeamAdmin(actor, document),
      can(actor, "update", document?.collection),
      !!document?.isDraft && actor.id === document?.createdById
    )
  )
);

// Note that read access to the source document is sufficient – the destination
// collection is chosen separately and authorized at that point.
allow(User, "duplicate", Document, (actor, document) =>
  and(
    !!document?.isActive,
    isTeamMutable(actor),
    can(actor, "read", document),
    or(
      can(actor, "createDocument", actor.team),
      // Guests and viewers are never team-level creators (see createDocument
      // on Team above), but may duplicate documents they can update - the
      // destination is still authorized separately in documents.duplicate.
      can(actor, "update", document)
    )
  )
);

allow(User, "move", Document, (actor, document) =>
  or(
    and(
      can(actor, "update", document),
      or(
        includesMembership(document, [
          DocumentPermission.ReadWrite,
          DocumentPermission.Admin,
        ]),
        can(actor, "updateDocument", document?.collection),
        and(!!document?.isDraft && actor.id === document?.createdById),
        and(!!document?.isDraft && !document?.collection)
      )
    ),
    and(!!document?.isActive, isPersonalOwner(actor, document))
  )
);

allow(User, "createChildDocument", Document, (actor, document) =>
  and(
    //
    !document?.isDraft,
    can(actor, "update", document)
  )
);

// Pins and insights are not shown for documents in a personal collection.
allow(User, ["updateInsights", "pin", "unpin"], Document, (actor, document) =>
  and(
    !document?.isDraft,
    !actor.isGuest,
    !document?.collection?.isPersonal,
    can(actor, "update", document),
    can(actor, "update", document?.collection)
  )
);

allow(User, "pinToHome", Document, (actor, document) =>
  and(
    !document?.isDraft,
    !!document?.isActive,
    !document?.collection?.isPersonal,
    isTeamAdmin(actor, document),
    isTeamMutable(actor)
  )
);

allow(User, "delete", Document, (actor, document) =>
  and(
    !document?.isDeleted,
    isTeamModel(actor, document),
    isTeamMutable(actor),
    or(
      can(actor, "unarchive", document),
      can(actor, "update", document),
      isPersonalOwner(actor, document),
      and(!document?.collection, actor.id === document?.createdById)
    )
  )
);

allow(User, "restore", Document, (actor, document) =>
  and(
    !actor.isGuest,
    !!document?.isDeleted,
    isTeamModel(actor, document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      and(!!document?.isDraft && actor.id === document?.createdById)
    )
  )
);

allow(User, "permanentDelete", Document, (actor, document) =>
  and(
    !actor.isGuest,
    !!document?.isDeleted,
    isTeamModel(actor, document),
    isTeamAdmin(actor, document),
    or(
      !document?.collection?.isPersonal,
      isCollectionOwner(actor, document?.collection)
    )
  )
);

allow(User, "archive", Document, (actor, document) =>
  and(
    !document?.isDraft,
    !!document?.isActive,
    or(
      and(
        can(actor, "update", document),
        or(
          includesMembership(document, [DocumentPermission.Admin]),
          and(isTeamAdmin(actor, document), can(actor, "read", document)),
          can(actor, "updateDocument", document?.collection)
        )
      ),
      isPersonalOwner(actor, document)
    )
  )
);

allow(User, "unarchive", Document, (actor, document) =>
  and(
    !document?.isDraft,
    !document?.isDeleted,
    !!document?.archivedAt,
    can(actor, "read", document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      and(!!document?.isDraft && actor.id === document?.createdById)
    )
  )
);

allow(
  Document,
  "restore",
  Revision,
  (document, revision) => document.id === revision?.documentId
);

allow(User, "updateDeprecatedReason", Document, (actor, document) =>
  and(
    isTeamMutable(actor),
    or(can(actor, "unarchive", document), can(actor, "restore", document))
  )
);

allow(User, "unpublish", Document, (user, document) => {
  if (
    !document ||
    user.isGuest ||
    user.isViewer ||
    !document.isActive ||
    document.isDraft
  ) {
    return false;
  }

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );

  // Documents in a personal collection are already private to the owner.
  if (document.collection.isPersonal) {
    return false;
  }
  if (cannot(user, "updateDocument", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

/**
 * Check if the actor owns the personal collection that the document is in. The
 * owner can always move, archive and delete these documents, also when the
 * collection is read-only.
 *
 * @param actor The actor to check.
 * @param document The document to check.
 * @returns True if the actor owns the personal collection of the document.
 */
function isPersonalOwner(actor: User, document: Document | null) {
  return !!and(
    isTeamMutable(actor),
    isCollectionOwner(actor, document?.collection)
  );
}

function includesMembership(
  document: Document | null,
  permissions: DocumentPermission[]
) {
  if (!document) {
    return false;
  }

  invariant(
    document.memberships,
    "Development: document memberships should be preloaded, did you forget withMembership scope?"
  );
  invariant(
    document.groupMemberships,
    "Development: document groupMemberships should be preloaded, did you forget withMembership scope?"
  );

  const permissionSet = new Set(permissions);
  const membershipIds: string[] = [];

  for (const membership of document.memberships) {
    if (permissionSet.has(membership.permission as DocumentPermission)) {
      membershipIds.push(membership.id);
    }
  }

  for (const membership of document.groupMemberships) {
    if (permissionSet.has(membership.permission as DocumentPermission)) {
      membershipIds.push(membership.id);
    }
  }

  return membershipIds.length > 0 ? membershipIds : false;
}
