import { User, Pin } from "@server/models";
import policy from "./policy";

const { allow } = policy;

allow(User, ["update", "delete"], Pin, (user, pin) => {
  if (user.teamId === pin.teamId && user.isAdmin) return true;
  return false;
});
