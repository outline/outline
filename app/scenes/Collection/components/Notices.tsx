import { ArchiveIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Collection from "~/models/Collection";
import ErrorBoundary from "~/components/ErrorBoundary";
import { DeprecationNotice } from "~/components/DeprecationNotice";
import { DeprecatedReason } from "~/components/DeprecatedReason";
import Time from "~/components/Time";

type Props = {
  collection: Collection;
};

export default function Notices({ collection }: Props) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary>
      {collection.isArchived && !collection.isDeleted && (
        <DeprecationNotice
          icon={<ArchiveIcon />}
          description={
            <DeprecatedReason key={collection.id} model={collection} />
          }
        >
          {t("Archived by {{userName}}", {
            userName: collection.archivedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={collection.archivedAt} addSuffix />
        </DeprecationNotice>
      )}
    </ErrorBoundary>
  );
}
