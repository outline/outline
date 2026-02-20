import { computed, observable } from "mobx";
import { t } from "i18next";
import { toast } from "sonner";
import {
  FileOperationState,
  FileOperationType,
  type FileOperationFormat,
} from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import type FileOperationsStore from "~/stores/FileOperationsStore";
import User from "./User";
import Model from "./base/Model";
import { AfterChange } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";

class FileOperation extends Model {
  static modelName = "FileOperation";

  store: FileOperationsStore;

  @observable
  state: FileOperationState;

  name: string;

  error: string | null;

  collectionId: string | null;

  documentId: string | null;

  @observable
  size: number;

  type: FileOperationType;

  format: FileOperationFormat;

  @Relation(() => User)
  user: User;

  @computed
  get sizeInMB(): string {
    return bytesToHumanReadable(this.size);
  }

  @computed
  get downloadUrl(): string {
    return `/api/fileOperations.redirect?id=${this.id}`;
  }

  // Hooks

  @AfterChange
  static handleExportToast(
    model: FileOperation,
    previousAttributes: Partial<FileOperation>
  ) {
    if (model.type !== FileOperationType.Export) {
      return;
    }

    const { ui, auth } = model.store.rootStore;
    if (model.user?.id !== auth.user?.id) {
      return;
    }

    const tracked = ui.exportToasts.get(model.id);
    if (!tracked) {
      return;
    }

    if (
      previousAttributes.state !== model.state &&
      model.state === FileOperationState.Complete
    ) {
      toast.success(t("Export complete"), {
        id: tracked.toastId,
        description: model.name,
        duration: Infinity,
        action: {
          label: t("Download"),
          onClick: () => window.open(model.downloadUrl, "_blank"),
        },
      });
      ui.removeExportToast(model.id);
    }

    if (
      previousAttributes.state !== model.state &&
      model.state === FileOperationState.Error
    ) {
      toast.error(t("Export failed"), {
        id: tracked.toastId,
        description: model.error || t("An unexpected error occurred"),
      });
      ui.removeExportToast(model.id);
    }
  }
}

export default FileOperation;
