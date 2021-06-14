// @flow
import { Team, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "read", Team, (user, team) => team && user.teamId === team.id);

allow(User, "share", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return team.sharing;
});

allow(User, ["update", "export", "manage"], Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return user.isAdmin;
});
