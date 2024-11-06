import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Collection from "~/models/Collection";
import ErrorBoundary from "~/components/ErrorBoundary";
import Notice from "~/components/Notice";
import Time from "~/components/Time";

type Props = {
  collection: Collection;
};

export default function Notices({ collection }: Props) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary>
      {collection.isArchived && !collection.isDeleted && (
        <Notice icon={<ArchiveIcon />}>
          {t("Archived by {{userName}}", {
            userName: collection.archivedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={collection.archivedAt} addSuffix />
        </Notice>
      )}
    </ErrorBoundary>
  );
}
