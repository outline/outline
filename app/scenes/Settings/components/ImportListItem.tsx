import capitalize from "lodash/capitalize";
import { observer } from "mobx-react";
import { CrossIcon, DoneIcon, WarningIcon } from "outline-icons";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import Spinner from "@shared/components/Spinner";
import { ImportState } from "@shared/types";
import Import from "~/models/Import";
import { Action } from "~/components/Actions";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import ListItem from "~/components/List/Item";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { ImportMenu } from "~/menus/ImportMenu";
import isCloudHosted from "~/utils/isCloudHosted";

type Props = {
  /** Import that's displayed as list item. */
  importModel: Import;
};

export const ImportListItem = observer(({ importModel }: Props) => {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const user = useCurrentUser();
  const theme = useTheme();
  const showProgress =
    importModel.state !== ImportState.Canceled &&
    importModel.state !== ImportState.Errored;
  const showErrorInfo =
    !isCloudHosted &&
    importModel.state === ImportState.Errored &&
    !!importModel.error;

  const stateMap = useMemo(
    () => ({
      [ImportState.Created]: t("Processing"),
      [ImportState.InProgress]: t("Processing"),
      [ImportState.Processed]: t("Processing"),
      [ImportState.Completed]: t("Completed"),
      [ImportState.Errored]: t("Failed"),
      [ImportState.Canceled]: t("Canceled"),
    }),
    [t]
  );

  const iconMap = useMemo(
    () => ({
      [ImportState.Created]: <Spinner />,
      [ImportState.InProgress]: <Spinner />,
      [ImportState.Processed]: <Spinner />,
      [ImportState.Completed]: <DoneIcon color={theme.accent} />,
      [ImportState.Errored]: <WarningIcon color={theme.danger} />,
      [ImportState.Canceled]: <CrossIcon color={theme.textTertiary} />,
    }),
    [theme]
  );

  const handleCancel = useCallback(async () => {
    const onCancel = async () => {
      try {
        await importModel.cancel();
        toast.success(t("Import canceled"));
      } catch (err) {
        toast.error(err.message);
      }
    };

    dialogs.openModal({
      title: t("Are you sure you want to cancel this import?"),
      content: (
        <ConfirmationDialog
          onSubmit={onCancel}
          submitText={t("Cancel")}
          savingText={`${t("Canceling")}…`}
          danger
        >
          {t(
            "Canceling this import will discard any progress made. This cannot be undone."
          )}
        </ConfirmationDialog>
      ),
    });
  }, [t, dialogs, importModel]);

  const handleDelete = useCallback(async () => {
    const onDelete = async () => {
      try {
        await importModel.delete();
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
  }, [t, dialogs, importModel]);

  return (
    <ListItem
      title={importModel.name}
      image={iconMap[importModel.state]}
      subtitle={
        <>
          {stateMap[importModel.state]}&nbsp;•&nbsp;
          {showErrorInfo && (
            <>
              {importModel.error}
              {`. ${t("Check server logs for more details.")}`}&nbsp;•&nbsp;
            </>
          )}
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
          {showProgress && (
            <>
              &nbsp;•&nbsp;
              {t("{{ count }} document imported", {
                count: importModel.documentCount,
              })}
            </>
          )}
        </>
      }
      actions={
        <Action>
          <ImportMenu
            importModel={importModel}
            onCancel={handleCancel}
            onDelete={handleDelete}
          />
        </Action>
      }
    />
  );
});
