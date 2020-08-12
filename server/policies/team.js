// @flow
import { AdminRequiredError } from "../errors";
import { Team, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "read", Team, (user, team) => team && user.teamId === team.id);

allow(User, "share", Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  return team.sharing;
});

allow(User, "auditLog", Team, (user) => {
  if (user.isAdmin) return true;
  return false;
});

allow(User, "invite", Team, (user) => {
  if (user.isAdmin) return true;
  return false;
});

// ??? policy for creating new groups, I don't know how to do this other than on the team level
allow(User, "group", Team, (user) => {
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});

allow(User, ["update", "export"], Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});
