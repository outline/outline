import { Import } from "@server/models";
import presentUser from "./user";

export default function presentImport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importModel: Import<any>
) {
  return {
    id: importModel.id,
    name: importModel.name,
    service: importModel.service,
    state: importModel.state,
    documentCount: importModel.documentCount,
    error: importModel.error,
    createdBy: presentUser(importModel.createdBy),
    createdById: importModel.createdById,
    createdAt: importModel.createdAt,
    updatedAt: importModel.updatedAt,
  };
}
