import { AccessRequest, User } from "@server/models";
import { allow } from "./cancan";
import { isTeamModel } from "./utils";

allow(User, "read", AccessRequest, (actor, accessRequest) =>
  isTeamModel(actor, accessRequest?.user)
);
