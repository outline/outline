import { ArchiveIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Notebook from "~/models/Notebook";
import ErrorBoundary from "~/components/ErrorBoundary";
import Notice from "~/components/Notice";
import Time from "~/components/Time";
type Props = {
  notebook: Notebook;
};
export default function Notices({ notebook }: Props) {
  const { t } = useTranslation();
  return (
    <ErrorBoundary>
      {notebook.isArchived && !notebook.isDeleted && (
        <Notice icon={<ArchiveIcon />}>
          {t("Archived by {{userName}}", {
            userName: notebook.archivedBy?.name ?? t("Unknown"),
          })}
          &nbsp;
          <Time dateTime={notebook.archivedAt} addSuffix />
        </Notice>
      )}
    </ErrorBoundary>
  );
}
