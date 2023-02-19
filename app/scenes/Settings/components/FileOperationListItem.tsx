import { observer } from "mobx-react";
import { ArchiveIcon, DoneIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import {
  FileOperationFormat,
  FileOperationState,
  FileOperationType,
} from "@shared/types";
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
    [FileOperationState.Creating]: t("Processing"),
    [FileOperationState.Uploading]: t("Processing"),
    [FileOperationState.Expired]: t("Expired"),
    [FileOperationState.Complete]: t("Completed"),
    [FileOperationState.Error]: t("Failed"),
  };

  const iconMapping = {
    [FileOperationState.Creating]: <Spinner />,
    [FileOperationState.Uploading]: <Spinner />,
    [FileOperationState.Expired]: <ArchiveIcon color={theme.textTertiary} />,
    [FileOperationState.Complete]: <DoneIcon color={theme.accent} />,
    [FileOperationState.Error]: <WarningIcon color={theme.danger} />,
  };

  const formatMapping = {
    [FileOperationFormat.JSON]: "JSON",
    [FileOperationFormat.MarkdownZip]: "Markdown",
    [FileOperationFormat.HTMLZip]: "HTML",
    [FileOperationFormat.PDF]: "PDF",
  };

  const format = formatMapping[fileOperation.format];
  const title =
    fileOperation.type === FileOperationType.Import ||
    fileOperation.collectionId
      ? fileOperation.name
      : t("All collections");

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
          {format ? <>&nbsp;•&nbsp;{format}</> : ""}
          {fileOperation.size ? <>&nbsp;•&nbsp;{fileOperation.sizeInMB}</> : ""}
        </>
      }
      actions={
        fileOperation.state === FileOperationState.Complete && handleDelete ? (
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
