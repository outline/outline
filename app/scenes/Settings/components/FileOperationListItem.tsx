import { observer } from "mobx-react";
import { ArchiveIcon, DoneIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { FileOperationFormat, FileOperationType } from "@shared/types";
import FileOperation from "~/models/FileOperation";
import { Action } from "~/components/Actions";
import ListItem from "~/components/List/Item";
import Spinner from "~/components/Spinner";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import FileOperationMenu from "~/menus/FileOperationMenu";

type Props = {
  fileOperation: FileOperation;
  handleDelete?: (fileOperation: FileOperation) => Promise<void>;
};

const FileOperationListItem = ({ fileOperation, handleDelete }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const theme = useTheme();
  const stateMapping = {
    complete: t("Completed"),
    creating: t("Processing"),
    expired: t("Expired"),
    uploading: t("Processing"),
    error: t("Failed"),
  };

  const iconMapping = {
    creating: <Spinner />,
    uploading: <Spinner />,
    expired: <ArchiveIcon color={theme.textTertiary} />,
    complete: <DoneIcon color={theme.primary} />,
    error: <WarningIcon color={theme.danger} />,
  };

  const formatToReadable = {
    [FileOperationFormat.MarkdownZip]: "Markdown",
    [FileOperationFormat.HTMLZip]: "HTML",
    [FileOperationFormat.PDFZip]: "PDF",
  };

  const format = formatToReadable[fileOperation.format];

  const title =
    fileOperation.type === FileOperationType.Import ||
    fileOperation.collectionId
      ? fileOperation.name
      : t("All collections") + (format ? ` • ${format}` : "");

  return (
    <ListItem
      title={title}
      image={iconMapping[fileOperation.state]}
      subtitle={
        <>
          {stateMapping[fileOperation.state]}&nbsp;•&nbsp;
          {fileOperation.error && <>{fileOperation.error}&nbsp;•&nbsp;</>}
          {t(`{{userName}} requested`, {
            userName:
              user.id === fileOperation.user.id
                ? t("You")
                : fileOperation.user.name,
          })}
          &nbsp;
          <Time dateTime={fileOperation.createdAt} addSuffix shorten />
          &nbsp;•&nbsp;{fileOperation.sizeInMB}
        </>
      }
      actions={
        fileOperation.state === "complete" && handleDelete ? (
          <Action>
            <FileOperationMenu
              id={fileOperation.id}
              onDelete={async (ev) => {
                ev.preventDefault();
                await handleDelete(fileOperation);
              }}
            />
          </Action>
        ) : undefined
      }
    />
  );
};

export default observer(FileOperationListItem);
