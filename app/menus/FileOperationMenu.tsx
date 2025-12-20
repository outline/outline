import { DownloadIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { FileOperationState, FileOperationType } from "@shared/types";
import type FileOperation from "~/models/FileOperation";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import {
  ActionSeparator,
  createAction,
  createExternalLinkAction,
} from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  fileOperation: FileOperation;
  onDelete: () => Promise<void>;
};

function FileOperationMenu({ fileOperation, onDelete }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(fileOperation);
  const section = "File operations";

  const actions = React.useMemo(
    () => [
      createExternalLinkAction({
        name: t("Download"),
        icon: <DownloadIcon />,
        section,
        visible:
          fileOperation.type === FileOperationType.Export &&
          fileOperation.state === FileOperationState.Complete,
        url: fileOperation.downloadUrl,
      }),
      ActionSeparator,
      createAction({
        name: t("Delete"),
        icon: <TrashIcon />,
        section,
        visible: can.delete,
        dangerous: true,
        perform: () => onDelete(),
      }),
    ],
    [
      t,
      can.delete,
      fileOperation.type,
      fileOperation.state,
      fileOperation.downloadUrl,
      onDelete,
    ]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("File")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default FileOperationMenu;
