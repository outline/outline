import { User, Tag } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable } from "./utils";

allow(User, "read", Tag, (actor, tag) =>
	and(isTeamModel(actor, tag), (actor.isMember || actor.isAdmin))
);

allow(User, "list", Tag, (actor, tag) =>
	and(isTeamModel(actor, tag), (actor.isMember || actor.isAdmin))
);

allow(User, "create", Tag, (actor, tag) =>
	and(
		isTeamModel(actor, tag),
		isTeamMutable(actor),
		!actor.isGuest,
		!actor.isViewer,
		(actor.isMember || actor.isAdmin)
	)
);

allow(User, "update", Tag, (actor, tag) =>
	and(isTeamAdmin(actor, tag), isTeamMutable(actor))
);

allow(User, "delete", Tag, (actor, tag) =>
	and(isTeamAdmin(actor, tag), isTeamMutable(actor))
);
