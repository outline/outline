import { AuthenticationProvider, User, Team } from "@server/models";
import { allow } from "./cancan";
import { isTeamAdmin, isTeamModel } from "./utils";

allow(User, "createAuthenticationProvider", Team, isTeamAdmin);

allow(User, "read", AuthenticationProvider, isTeamModel);

allow(User, ["update", "delete"], AuthenticationProvider, isTeamAdmin);
