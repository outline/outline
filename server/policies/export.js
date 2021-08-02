// @flow
import { ApiKey, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "delete", ApiKey, (user, exportData) => {
  if (user.isViewer) return false;
  return user && user.id === exportData.userId;
});
