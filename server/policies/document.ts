import invariant from "invariant";
import {
  CommentingAccess,
  DocumentPermission,
  TeamPreference,
} from "@shared/types";
import { Document, Revision, User, Team } from "@server/models";
import { allow, cannot, can } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, "createDocument", Team, (actor, document) =>
  and(
    //
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, document),
    isTeamMutable(actor)
  )
);

allow(User, "createPersonalDocument", Team, (actor, team) =>
  and(
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !!team?.getPreference(TeamPreference.PersonalDocs)
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
      isPersonalOwner(actor, document),
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
    or(!document?.collection, can(actor, "share", document?.collection))
  )
);

allow(User, "update", Document, (actor, document) =>
  and(canModify(actor, document), isWritableLocation(actor, document))
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
    isWritableLocation(actor, document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      isTeamAdmin(actor, document),
      can(actor, "update", document?.collection),
      isPersonalOwner(actor, document),
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
    can(actor, "createDocument", actor.team)
  )
);

allow(User, "move", Document, (actor, document) =>
  and(
    canModify(actor, document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      isPersonalOwner(actor, document),
      and(!!document?.isDraft && actor.id === document?.createdById),
      and(!!document?.isDraft && !document?.collection)
    )
  )
);

allow(User, "createChildDocument", Document, (actor, document) =>
  and(
    //
    !document?.isDraft,
    can(actor, "update", document)
  )
);

allow(User, ["updateInsights", "pin", "unpin"], Document, (actor, document) =>
  and(
    !document?.isDraft,
    !actor.isGuest,
    can(actor, "update", document),
    can(actor, "update", document?.collection)
  )
);

allow(User, "pinToHome", Document, (actor, document) =>
  and(
    //
    !document?.isDraft,
    !!document?.isActive,
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
      isPersonalOwner(actor, document),
      and(!!document?.isDraft && actor.id === document?.createdById)
    )
  )
);

allow(User, "permanentDelete", Document, (actor, document) =>
  and(
    !actor.isGuest,
    !!document?.isDeleted,
    isTeamModel(actor, document),
    isTeamAdmin(actor, document)
  )
);

allow(User, "archive", Document, (actor, document) =>
  and(
    !document?.isDraft,
    !!document?.isActive,
    canModify(actor, document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      and(isTeamAdmin(actor, document), can(actor, "read", document)),
      isPersonalOwner(actor, document),
      can(actor, "updateDocument", document?.collection)
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
      isPersonalOwner(actor, document),
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

  if (document.isPersonal) {
    return isPersonalOwner(user, document) && user.teamId === document.teamId;
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

/**
 * Whether the actor owns the personal space that a document lives in. Ownership
 * is carried by the document itself, so it grants access without a membership.
 *
 * @param actor the user being authorized.
 * @param document the document being accessed.
 * @returns true when the actor owns the document's personal space.
 */
function isPersonalOwner(actor: User, document: Document | null) {
  return !!document?.personalOwnerId && actor.id === document.personalOwnerId;
}

/**
 * Whether a document's location still accepts changes to its content. Turning
 * personal documents off freezes the ones that already exist rather than
 * hiding them, so their owners keep read access and can file them into a
 * collection, archive them, or delete them.
 *
 * @param actor the user being authorized.
 * @param document the document being changed.
 * @returns true when the document's location permits writes.
 */
function isWritableLocation(actor: User, document: Document | null) {
  return (
    !document?.isPersonal ||
    !!actor.team?.getPreference(TeamPreference.PersonalDocs)
  );
}

/**
 * The permission checks that let a user change a document, ignoring where the
 * document lives. Shared by the abilities that write content and by the ones
 * that only relocate or retire it.
 *
 * @param actor the user being authorized.
 * @param document the document being changed.
 * @returns true when the actor holds a write permission on the document.
 */
function canModify(actor: User, document: Document | null) {
  return and(
    !!document?.isActive,
    isTeamMutable(actor),
    can(actor, "read", document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      isPersonalOwner(actor, document),
      and(!!document?.isDraft && actor.id === document?.createdById)
    )
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
