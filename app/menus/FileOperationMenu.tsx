import { DownloadIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import { FileOperationState, FileOperationType } from "@shared/types";
import FileOperation from "~/models/FileOperation";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  fileOperation: FileOperation;
  onDelete: (ev: React.SyntheticEvent) => Promise<void>;
};

function FileOperationMenu({ fileOperation, onDelete }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(fileOperation);
  const menu = useMenuState({
    modal: true,
  });

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Export options")}>
        <Template
          {...menu}
          items={[
            {
              type: "link",
              title: t("Download"),
              icon: <DownloadIcon />,
              visible:
                fileOperation.type === FileOperationType.Export &&
                fileOperation.state === FileOperationState.Complete,
              href: fileOperation.downloadUrl,
            },
            {
              type: "separator",
            },
            {
              type: "button",
              title: t("Delete"),
              visible: can.delete,
              icon: <TrashIcon />,
              dangerous: true,
              onClick: onDelete,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default FileOperationMenu;
