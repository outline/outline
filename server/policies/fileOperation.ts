import { FileOperationState, FileOperationType } from "@shared/types";
import { User, Team, FileOperation } from "@server/models";
import { allow, can } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

const TerminalStates = [
  FileOperationState.Complete,
  FileOperationState.Error,
  FileOperationState.Expired,
];

/**
 * An export is a snapshot that outlives the permissions it was created under,
 * so access to the source is re-checked rather than trusting the ownership of
 * the file operation alone.
 */
function canAccessSource(actor: User, fileOperation: FileOperation) {
  if (fileOperation.type !== FileOperationType.Export) {
    return true;
  }
  if (fileOperation.documentId) {
    return can(actor, "download", fileOperation.document);
  }
  if (fileOperation.collectionId) {
    return can(actor, "download", fileOperation.collection);
  }
  // Exports without a collection or document cover the entire workspace.
  return can(actor, "createExport", actor.team);
}

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
    or(
      isTeamAdmin(actor, fileOperation),
      and(
        fileOperation?.userId === actor.id,
        !!fileOperation && canAccessSource(actor, fileOperation)
      )
    )
  )
);

allow(User, "delete", FileOperation, (actor, fileOperation) =>
  and(
    isTeamAdmin(actor, fileOperation),
    isTeamMutable(actor),
    or(
      fileOperation?.type !== FileOperationType.Export,
      !!fileOperation && TerminalStates.includes(fileOperation.state)
    )
  )
);
