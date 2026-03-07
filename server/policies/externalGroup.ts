import { ExternalGroup } from "@server/models";
import User from "@server/models/User";
import { allow } from "./cancan";
import { isTeamAdmin } from "./utils";

allow(User, "read", ExternalGroup, isTeamAdmin);
