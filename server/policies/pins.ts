import { User, Pin } from "@server/models";
import { allow } from "./cancan";
import { isTeamAdmin } from "./utils";

allow(User, ["update", "delete"], Pin, isTeamAdmin);
