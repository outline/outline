// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import FileOperation from "models/FileOperation";
import { Action } from "components/Actions";
import ListItem from "components/List/Item";
import Time from "components/Time";
import useCurrentUser from "hooks/useCurrentUser";
import FileOperationMenu from "menus/FileOperationMenu";
type Props = {|
  fileOperation: FileOperation,
  handleDelete: (FileOperation) => Promise<void>,
|};

const FileOperationListItem = ({ fileOperation, handleDelete }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const stateMapping = {
    creating: t("Processing"),
    expired: t("Expired"),
    uploading: t("Processing"),
    error: t("Error"),
  };

  return (
    <ListItem
      title={
        fileOperation.collection
          ? fileOperation.collection.name
          : t("All collections")
      }
      subtitle={
        <>
          {fileOperation.state !== "complete" && (
            <>{stateMapping[fileOperation.state]}&nbsp;•&nbsp;</>
          )}
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
        fileOperation.state === "complete" ? (
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

export default FileOperationListItem;
