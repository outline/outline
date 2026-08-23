import { differenceInDays } from "date-fns";
import { TrashIcon, ArchiveIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import type Note from "~/models/Note";
import ErrorBoundary from "~/components/ErrorBoundary";
import Notice from "~/components/Notice";
import Time from "~/components/Time";
type Props = {
  note: Note;
  readOnly: boolean;
};
function Days(props: { dateTime: string }) {
  const { t } = useTranslation();
  const days = differenceInDays(new Date(props.dateTime), new Date());
  return (
    <>
      {t(`{{ count }} days`, {
        count: days,
      })}
    </>
  );
}
export default function Notices({ note }: Props) {
  const { t } = useTranslation();
  function permanentlyDeletedDescription() {
    if (!note.permanentlyDeletedAt) {
      return;
    }
    // if the permanently deleted date is in the past, show the current date
    // to avoid showing a negative number of days. The cleanup task will
    // permanently delete the note at the next run.
    const permanentlyDeletedAt =
      new Date(note.permanentlyDeletedAt) < new Date()
        ? new Date().toISOString()
        : note.permanentlyDeletedAt;
    return (
      <Trans>
        This document will be permanently deleted in{" "}
        <Days dateTime={permanentlyDeletedAt} /> unless restored.
      </Trans>
    );
  }
  return (
    <ErrorBoundary>
      {note.archivedAt && !note.deletedAt && (
        <Notice icon={<ArchiveIcon />}>
          {t("Archived by {{userName}}", {
            userName: note.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={note.updatedAt} addSuffix />
        </Notice>
      )}
      {note.deletedAt && (
        <Notice
          icon={<TrashIcon />}
          description={permanentlyDeletedDescription()}
        >
          {t("Deleted by {{userName}}", {
            userName: note.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={note.deletedAt} addSuffix />
        </Notice>
      )}
    </ErrorBoundary>
  );
}
