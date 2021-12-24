import { User, Team } from "@server/models";
import policy from "./policy";

const { allow } = policy;

allow(User, ["createPin", "updatePin"], Team, (user, team) => {
  if (user.teamId === team.id && user.isAdmin) return true;
  return false;
});
