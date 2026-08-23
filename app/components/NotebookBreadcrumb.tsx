import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type Notebook from "~/models/Notebook";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import { archivePath, notebookPath } from "~/utils/routeHelpers";
import Breadcrumb from "./Breadcrumb";
import { createInternalLinkAction } from "~/actions";
import { ActiveNotebookSection } from "~/actions/sections";
type Props = {
  notebook: Notebook;
};
export const NotebookBreadcrumb: React.FC<Props> = ({ notebook }) => {
  const { t } = useTranslation();
  const actions = React.useMemo(
    () => [
      createInternalLinkAction({
        name: t("Archive"),
        section: ActiveNotebookSection,
        icon: <ArchiveIcon />,
        visible: notebook.isArchived,
        to: archivePath(),
      }),
      createInternalLinkAction({
        name: notebook.name,
        section: ActiveNotebookSection,
        icon: <CollectionIcon notebook={notebook} expanded />,
        to: notebookPath(notebook),
      }),
    ],
    [notebook, t]
  );
  return <Breadcrumb actions={actions} highlightFirstItem />;
};
