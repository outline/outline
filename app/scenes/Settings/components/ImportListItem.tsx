import capitalize from "lodash/capitalize";
import { observer } from "mobx-react";
import { DoneIcon, WarningIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import { ImportState } from "@shared/types";
import Import from "~/models/Import";
import { Action } from "~/components/Actions";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { ListItem } from "~/components/Sharing/components/ListItem";
import Spinner from "~/components/Spinner";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import ImportMenu from "~/menus/ImportMenu";

type Props = {
  importModel: Import;
};

export const ImportListItem = observer(({ importModel }: Props) => {
  const { t } = useTranslation();
  const { dialogs, imports } = useStores();
  const user = useCurrentUser();
  const theme = useTheme();
  const prevState = usePrevious(importModel.state);
  const can = usePolicy(importModel, {
    force:
      prevState !== ImportState.Completed &&
      importModel.state === ImportState.Completed,
  });

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

  const handleDelete = React.useCallback(async () => {
    const onDelete = async () => {
      try {
        await imports.delete(importModel);
        toast.success(t("Import deleted"));
      } catch (err) {
        toast.error(err.message);
      }
    };

    dialogs.openModal({
      title: t("Are you sure you want to delete this import?"),
      content: (
        <ConfirmationDialog
          onSubmit={onDelete}
          savingText={`${t("Deleting")}…`}
          danger
        >
          {t(
            "Deleting this import will also delete all collections and documents that were created from it. This cannot be undone."
          )}
        </ConfirmationDialog>
      ),
    });
  }, [dialogs, imports, t, importModel]);

  return (
    <ListItem
      title={importModel.name}
      image={iconMap[importModel.state]}
      subtitle={
        <>
          {stateMap[importModel.state]}&nbsp;•&nbsp;
          {t(`{{userName}} requested`, {
            userName:
              user.id === importModel.createdBy.id
                ? t("You")
                : importModel.createdBy.name,
          })}
          &nbsp;
          <Time dateTime={importModel.createdAt} addSuffix shorten />
          &nbsp;•&nbsp;
          {capitalize(importModel.service)}
          {importModel.state !== ImportState.Errored && (
            <>
              &nbsp;•&nbsp;
              {t("{{ count }} page imported", { count: importModel.pageCount })}
            </>
          )}
        </>
      }
      actions={
        can.delete && (
          <Action>
            <ImportMenu importModel={importModel} onDelete={handleDelete} />
          </Action>
        )
      }
    />
  );
});
