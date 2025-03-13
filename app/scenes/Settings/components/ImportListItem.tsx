import { ImportState } from "@shared/types";
import capitalize from "lodash/capitalize";
import { observer } from "mobx-react";
import { DoneIcon, WarningIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import FileOperation from "~/models/FileOperation";
import Import from "~/models/Import";
import { Action } from "~/components/Actions";
import { ListItem } from "~/components/Sharing/components/ListItem";
import Spinner from "~/components/Spinner";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import FileOperationListItem from "./FileOperationListItem";

type Props = {
  item: Import | FileOperation;
};

export const ImportListItem = observer(({ item }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const theme = useTheme();

  const stateMap = React.useMemo(
    () => ({
      [ImportState.Created]: t("Processing"),
      [ImportState.InProgress]: t("Processing"),
      [ImportState.Processed]: t("Processing"),
      [ImportState.Completed]: t("Completed"),
      [ImportState.Errored]: t("Failed"),
    }),
    [t]
  );

  const iconMap = React.useMemo(
    () => ({
      [ImportState.Created]: <Spinner />,
      [ImportState.InProgress]: <Spinner />,
      [ImportState.Processed]: <Spinner />,
      [ImportState.Completed]: <DoneIcon color={theme.accent} />,
      [ImportState.Errored]: <WarningIcon color={theme.danger} />,
    }),
    [theme]
  );

  if (item instanceof FileOperation) {
    return <FileOperationListItem fileOperation={item} />;
  }

  return (
    <ListItem
      title={item.name}
      image={iconMap[item.state]}
      subtitle={
        <>
          {stateMap[item.state]}&nbsp;•&nbsp;
          {t(`{{userName}} requested`, {
            userName:
              user.id === item.createdBy.id ? t("You") : item.createdBy.name,
          })}
          <Time dateTime={item.createdAt} addSuffix shorten />
          &nbsp;•&nbsp;
          {capitalize(item.service)}&nbsp;•&nbsp;
          {t("{{ count }} pages imported", { count: item.pageCount })}
        </>
      }
      // actions={
      //   item.state === ImportState.Completed && (
      //     <Action>
      //       <FileOperationMenu
      //         fileOperation={fileOperation}
      //         onDelete={
      //           fileOperation.type === FileOperationType.Import
      //             ? handleConfirmDelete
      //             : handleDelete
      //         }
      //       />
      //     </Action>
      //   )
      // }
    />
  );
});
