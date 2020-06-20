// @flow
import policy from "./policy";
import { ApiKey, User } from "../models";

const { allow } = policy;

allow(User, "create", ApiKey);

allow(
  User,
  ["read", "update", "delete"],
  ApiKey,
  (user, apiKey) => user && user.id === apiKey.userId
);
