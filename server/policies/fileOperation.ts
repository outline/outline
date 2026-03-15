import { FileOperationState, FileOperationType } from "@shared/types";
import { User, Team, FileOperation } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

allow(
  User,
  ["createFileOperation", "createExport"],
  Team,
  // Note: Not checking for isTeamMutable here because we want to allow exporting data in read-only.
  isTeamAdmin
);

allow(User, "read", FileOperation, (actor, fileOperation) =>
  and(
    isTeamModel(actor, fileOperation),
    or(isTeamAdmin(actor, fileOperation), fileOperation?.userId === actor.id)
  )
);

allow(User, "delete", FileOperation, (actor, fileOperation) =>
  and(
    isTeamAdmin(actor, fileOperation),
    isTeamMutable(actor),
    or(
      fileOperation?.type !== FileOperationType.Export,
      fileOperation?.state === FileOperationState.Complete
    )
  )
);
