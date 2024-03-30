import { FileOperationState, FileOperationType } from "@shared/types";
import { User, Team, FileOperation } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, or } from "./utils";

allow(
  User,
  ["createFileOperation", "createImport", "createExport"],
  Team,
  isTeamAdmin
);

allow(User, "read", FileOperation, isTeamAdmin);

allow(User, "delete", FileOperation, (actor, fileOperation) =>
  and(
    isTeamAdmin(actor, fileOperation),
    or(
      fileOperation?.type !== FileOperationType.Export,
      fileOperation?.state === FileOperationState.Complete
    )
  )
);
