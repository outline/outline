// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import FileOperation from "models/FileOperation";
import Button from "components/Button";
import ListItem from "components/List/Item";
import Time from "components/Time";

type Props = {|
  fileOperation: FileOperation,
|};

const FileOperationListItem = ({ fileOperation }: Props) => {
  const { t } = useTranslation();

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
              fileOperation.id === fileOperation.user.id
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
          <Button
            as="a"
            href={`/api/fileOperations.redirect?id=${fileOperation.id}`}
            neutral
          >
            {t("Download")}
          </Button>
        ) : undefined
      }
    />
  );
};

export default FileOperationListItem;
