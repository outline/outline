// @flow
import { ApiKey, User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "createApiKey", Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  return true;
});

allow(
  User,
  ["read", "update", "delete"],
  ApiKey,
  (user, apiKey) => user && user.id === apiKey.userId
);
