import { Team, User } from "../models";
import policy from "./policy";

const { allow } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "read", Team, (user, team) => team && user.teamId === team.id);
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "share", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return team.sharing;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, ["update", "export", "manage"], Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return user.isAdmin;
});
