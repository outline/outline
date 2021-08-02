// @flow
import { Export, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "delete", Export, (user, exportData) => {
  if (user.isViewer) return false;
  return user && user.id === exportData.userId;
});
