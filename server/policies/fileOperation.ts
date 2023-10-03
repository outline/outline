import { FileOperationState, FileOperationType } from "@shared/types";
import { User, Team, FileOperation } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["createFileOperation", "createImport", "createExport"],
  Team,
  (user, team) => {
    if (!team || user.isViewer || user.teamId !== team.id) {
      return false;
    }
    return user.isAdmin;
  }
);

allow(User, "read", FileOperation, (user, fileOperation) => {
  if (!fileOperation || user.isViewer || user.teamId !== fileOperation.teamId) {
    return false;
  }
  return user.isAdmin;
});

allow(User, "delete", FileOperation, (user, fileOperation) => {
  if (!fileOperation || user.isViewer || user.teamId !== fileOperation.teamId) {
    return false;
  }
  if (
    fileOperation.type === FileOperationType.Export &&
    fileOperation.state !== FileOperationState.Complete
  ) {
    return false;
  }
  return user.isAdmin;
});
