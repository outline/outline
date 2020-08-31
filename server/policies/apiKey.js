// @flow
import { ApiKey, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "create", ApiKey);

allow(
  User,
  ["read", "update", "delete"],
  ApiKey,
  (user, apiKey) => user && user.id === apiKey.userId
);
