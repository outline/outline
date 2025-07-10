import { DownloadIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { FileOperationState, FileOperationType } from "@shared/types";
import FileOperation from "~/models/FileOperation";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import {
  createActionV2,
  createActionV2Separator,
  createExternalLinkActionV2,
  createRootMenuAction,
} from "~/actions";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  fileOperation: FileOperation;
  onDelete: (ev: React.SyntheticEvent) => Promise<void>;
};

function FileOperationMenu({ fileOperation, onDelete }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(fileOperation);
  const section = "File operations";

  const actions = [
    createExternalLinkActionV2({
      name: t("Download"),
      icon: <DownloadIcon />,
      section,
      visible:
        fileOperation.type === FileOperationType.Export &&
        fileOperation.state === FileOperationState.Complete,
      url: fileOperation.downloadUrl,
    }),
    createActionV2Separator(),
    createActionV2({
      name: t("Delete"),
      icon: <TrashIcon />,
      section,
      visible: can.delete,
      dangerous: true,
      perform: () => onDelete,
    }),
  ];

  const rootAction = createRootMenuAction(actions);

  return (
    <DropdownMenu
      action={rootAction}
      ariaLabel={t("File")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default FileOperationMenu;
