import invariant from "invariant";
import { DocumentPermission, TeamPreference } from "@shared/types";
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
      and(
        !!document?.isWorkspaceTemplate,
        can(actor, "readTemplate", actor.team)
      ),
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

allow(User, "comment", Document, (actor, document) =>
  and(
    !!document?.isActive,
    !document?.template,
    isTeamMutable(actor),
    // TODO: We'll introduce a separate permission for commenting
    or(
      and(!actor.isGuest, can(actor, "read", document)),
      and(actor.isGuest, can(actor, "update", document))
    ),
    or(!document?.collection, document?.collection?.commenting !== false)
  )
);

allow(
  User,
  ["star", "unstar", "subscribe", "unsubscribe"],
  Document,
  (actor, document) =>
    and(
      //
      !document?.template,
      can(actor, "read", document)
    )
);

allow(User, "share", Document, (actor, document) =>
  and(
    !!document?.isActive,
    !document?.template,
    isTeamMutable(actor),
    can(actor, "read", document),
    or(!document?.collection, can(actor, "share", document?.collection))
  )
);

allow(User, "update", Document, (actor, document) =>
  and(
    !!document?.isActive,
    isTeamMutable(actor),
    can(actor, "read", document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      or(
        can(actor, "updateDocument", document?.collection),
        and(!!document?.isDraft && actor.id === document?.createdById),
        and(
          !!document?.isWorkspaceTemplate,
          or(
            actor.id === document?.createdById,
            can(actor, "updateTemplate", actor.team)
          )
        )
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
    !document?.template,
    can(actor, "update", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      and(isTeamAdmin(actor, document), can(actor, "read", document)),
      can(actor, "updateDocument", document?.collection),
      !!document?.isDraft && actor.id === document?.createdById
    )
  )
);

allow(User, "duplicate", Document, (actor, document) =>
  and(
    can(actor, "update", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      and(isTeamAdmin(actor, document), can(actor, "read", document)),
      can(actor, "updateDocument", document?.collection),
      !!document?.isDraft && actor.id === document?.createdById,
      and(
        !!document?.isWorkspaceTemplate,
        or(
          actor.id === document?.createdById,
          can(actor, "updateTemplate", actor.team)
        )
      )
    )
  )
);

allow(User, "move", Document, (actor, document) =>
  and(
    can(actor, "update", document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      and(!!document?.isDraft && actor.id === document?.createdById),
      and(!!document?.isDraft && !document?.collection),
      and(
        !!document?.isWorkspaceTemplate,
        or(
          actor.id === document?.createdById,
          can(actor, "updateTemplate", actor.team)
        )
      )
    )
  )
);

allow(User, "createChildDocument", Document, (actor, document) =>
  and(
    //
    !document?.isDraft,
    !document?.template,
    can(actor, "update", document)
  )
);

allow(User, ["updateInsights", "pin", "unpin"], Document, (actor, document) =>
  and(
    !document?.isDraft,
    !document?.template,
    !actor.isGuest,
    can(actor, "update", document),
    can(actor, "update", document?.collection)
  )
);

allow(User, "pinToHome", Document, (actor, document) =>
  and(
    //
    !document?.isDraft,
    !document?.template,
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
      and(
        !document?.isWorkspaceTemplate,
        !document?.collection,
        actor.id === document?.createdById
      )
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
      and(!!document?.isDraft && actor.id === document?.createdById),
      and(
        !!document?.isWorkspaceTemplate,
        can(actor, "updateTemplate", actor.team)
      )
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
    !document?.template,
    !document?.isDraft,
    !!document?.isActive,
    can(actor, "update", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      and(isTeamAdmin(actor, document), can(actor, "read", document)),
      can(actor, "updateDocument", document?.collection)
    )
  )
);

allow(User, "unarchive", Document, (actor, document) =>
  and(
    !document?.template,
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

  if (
    document.isWorkspaceTemplate &&
    (user.id === document.createdById || can(user, "updateTemplate", user.team))
  ) {
    return true;
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
