import { observer } from "mobx-react";
import { ArchiveIcon, DoneIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import {
  FileOperationFormat,
  FileOperationState,
  FileOperationType,
} from "@shared/types";
import FileOperation from "~/models/FileOperation";
import { Action } from "~/components/Actions";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import ListItem from "~/components/List/Item";
import Spinner from "~/components/Spinner";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import FileOperationMenu from "~/menus/FileOperationMenu";
import isCloudHosted from "~/utils/isCloudHosted";

type Props = {
  fileOperation: FileOperation;
};

const FileOperationListItem = ({ fileOperation }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const theme = useTheme();
  const { dialogs, fileOperations } = useStores();

  const stateMapping = {
    [FileOperationState.Creating]: t("Processing"),
    [FileOperationState.Uploading]: t("Processing"),
    [FileOperationState.Expired]: t("Expired"),
    [FileOperationState.Complete]: t("Completed"),
    [FileOperationState.Error]: t("Failed"),
  };

  const iconMapping: Record<FileOperationState, React.JSX.Element> = {
    [FileOperationState.Creating]: <Spinner />,
    [FileOperationState.Uploading]: <Spinner />,
    [FileOperationState.Expired]: <ArchiveIcon color={theme.textTertiary} />,
    [FileOperationState.Complete]: <DoneIcon color={theme.accent} />,
    [FileOperationState.Error]: <WarningIcon color={theme.danger} />,
  };

  const formatMapping: Record<FileOperationFormat, string> = {
    [FileOperationFormat.JSON]: "JSON",
    [FileOperationFormat.Notion]: "Notion",
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

  const handleDelete = React.useCallback(async () => {
    try {
      await fileOperations.delete(fileOperation);

      if (fileOperation.type === FileOperationType.Import) {
        toast.success(t("Import deleted"));
      } else {
        toast.success(t("Export deleted"));
      }
    } catch (err) {
      toast.error(err.message);
    }
  }, [fileOperation, fileOperations, t]);

  const handleConfirmDelete = React.useCallback(async () => {
    dialogs.openModal({
      title: t("Are you sure you want to delete this import?"),
      content: (
        <ConfirmationDialog
          onSubmit={handleDelete}
          savingText={`${t("Deleting")}…`}
          danger
        >
          {t(
            "Deleting this import will also delete all collections and documents that were created from it. This cannot be undone."
          )}
        </ConfirmationDialog>
      ),
    });
  }, [dialogs, t, handleDelete]);

  const showMenu =
    (fileOperation.type === FileOperationType.Export &&
      fileOperation.state === FileOperationState.Complete) ||
    fileOperation.type === FileOperationType.Import;

  const selfHostedHelp = isCloudHosted
    ? ""
    : `. ${t("Check server logs for more details.")}`;

  return (
    <ListItem
      title={title}
      image={iconMapping[fileOperation.state]}
      subtitle={
        <>
          {stateMapping[fileOperation.state]}&nbsp;•&nbsp;
          {fileOperation.error && (
            <>
              {fileOperation.error}
              {selfHostedHelp}&nbsp;•&nbsp;
            </>
          )}
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
        showMenu && (
          <Action>
            <FileOperationMenu
              fileOperation={fileOperation}
              onDelete={
                fileOperation.type === FileOperationType.Import
                  ? handleConfirmDelete
                  : handleDelete
              }
            />
          </Action>
        )
      }
    />
  );
};

export default observer(FileOperationListItem);
