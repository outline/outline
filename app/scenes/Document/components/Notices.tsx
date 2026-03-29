import { differenceInDays } from "date-fns";
import { TrashIcon, ArchiveIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import ErrorBoundary from "~/components/ErrorBoundary";
import Notice from "~/components/Notice";
import Time from "~/components/Time";

type Props = {
  document: Document;
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

export default function Notices({ document }: Props) {
  const { t } = useTranslation();

  function permanentlyDeletedDescription() {
    if (!document.permanentlyDeletedAt) {
      return;
    }

    // if the permanently deleted date is in the past, show the current date
    // to avoid showing a negative number of days. The cleanup task will
    // permanently delete the document at the next run.
    const permanentlyDeletedAt =
      new Date(document.permanentlyDeletedAt) < new Date()
        ? new Date().toISOString()
        : document.permanentlyDeletedAt;

    return (
      <Trans>
        This document will be permanently deleted in{" "}
        <Days dateTime={permanentlyDeletedAt} /> unless restored.
      </Trans>
    );
  }

  return (
    <ErrorBoundary>
      {document.archivedAt && !document.deletedAt && (
        <Notice icon={<ArchiveIcon />}>
          {t("Archived by {{userName}}", {
            userName: document.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={document.updatedAt} addSuffix />
        </Notice>
      )}
      {document.deletedAt && (
        <Notice
          icon={<TrashIcon />}
          description={permanentlyDeletedDescription()}
        >
          {t("Deleted by {{userName}}", {
            userName: document.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={document.deletedAt} addSuffix />
        </Notice>
      )}
    </ErrorBoundary>
  );
}
