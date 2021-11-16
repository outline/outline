import { ApiKey, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "createApiKey", Team, (user, team) => {
  if (!team || user.isViewer || user.teamId !== team.id) return false;
  return true;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, ["read", "update", "delete"], ApiKey, (user, apiKey) => {
  if (user.isViewer) return false;
  return user && user.id === apiKey.userId;
});
