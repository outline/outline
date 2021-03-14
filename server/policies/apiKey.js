// @flow
import { ApiKey, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "create", ApiKey, (user) => !user.isViewer);

allow(User, ["read", "update", "delete"], ApiKey, (user, apiKey) => {
  if (user.isViewer) return false;
  return user && user.id === apiKey.userId;
});
