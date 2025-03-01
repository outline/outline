import { User, Revision } from "@server/models";
import { allow } from "./cancan";
import { isTeamAdmin } from "./utils";

allow(User, ["update"], Revision, isTeamAdmin);
