import { User, Team } from "@server/models";
import policy from "./policy";

const { allow } = policy;

allow(User, ["createPin", "updatePin", "deletePin"], Team, (user, team) => {
  if (user.teamId === team.id && user.isAdmin) return true;
  return false;
});
