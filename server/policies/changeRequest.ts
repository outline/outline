import { ChangeRequestStatus } from "@shared/types";
import { ChangeRequest, User } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, or } from "./utils";

type ChangeRequestPolicyOptions = {
  /** Whether the actor maintains the draft document's collection. */
  isMaintainer?: boolean;
};

allow(
  User,
  "read",
  ChangeRequest,
  (actor, changeRequest, options?: ChangeRequestPolicyOptions) =>
    and(
      isTeamModel(actor, changeRequest),
      or(
        isTeamAdmin(actor, changeRequest),
        actor.id === changeRequest?.submittedById,
        options?.isMaintainer,
        changeRequest?.isMaintainer
      )
    )
);

allow(
  User,
  ["approve", "reject"],
  ChangeRequest,
  (actor, changeRequest, options?: ChangeRequestPolicyOptions) =>
    and(
      isTeamModel(actor, changeRequest),
      changeRequest?.status === ChangeRequestStatus.Submitted,
      or(
        isTeamAdmin(actor, changeRequest),
        options?.isMaintainer,
        changeRequest?.isMaintainer
      )
    )
);

allow(User, "withdraw", ChangeRequest, (actor, changeRequest) =>
  and(
    isTeamModel(actor, changeRequest),
    changeRequest?.status === ChangeRequestStatus.Submitted,
    actor.id === changeRequest?.submittedById
  )
);
