import { differenceInDays } from "date-fns";
import { TrashIcon, ArchiveIcon } from "outline-icons";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import type Document from "~/models/Document";
import ErrorBoundary from "~/components/ErrorBoundary";
import { DeprecationNotice } from "~/components/DeprecationNotice";
import { DeprecatedReason } from "~/components/DeprecatedReason";
import Time from "~/components/Time";

/**
 * A notice shown above the document title, for example when the document is
 * archived or deleted.
 */
export const DocumentNotice = styled(DeprecationNotice)``;

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

  function destroyedDescription() {
    if (!document.willDestroyAt) {
      return;
    }

    // if the destroy date is in the past, show the current date to avoid
    // showing a negative number of days. The cleanup task will destroy the
    // document at the next run.
    const destroyAt =
      new Date(document.willDestroyAt) < new Date()
        ? new Date().toISOString()
        : document.willDestroyAt;

    return (
      <Trans>
        This document will be permanently deleted in{" "}
        <Days dateTime={destroyAt} /> unless restored.
      </Trans>
    );
  }

  return (
    <ErrorBoundary>
      {document.archivedAt && !document.deletedAt && (
        <DocumentNotice
          icon={<ArchiveIcon />}
          description={<DeprecatedReason key={document.id} model={document} />}
        >
          {t("Archived by {{userName}}", {
            userName: document.updatedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={document.updatedAt} addSuffix />
        </DocumentNotice>
      )}
      {document.deletedAt && (
        <DocumentNotice
          icon={<TrashIcon />}
          description={
            <>
              {destroyedDescription()}
              <DeprecatedReason key={document.id} model={document} />
            </>
          }
        >
          {t("Deleted by {{userName}}", {
            userName: document.deletedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={document.deletedAt} addSuffix />
        </DocumentNotice>
      )}
    </ErrorBoundary>
  );
}
