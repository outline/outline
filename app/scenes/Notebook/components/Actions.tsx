import { observer } from "mobx-react";
import { EditIcon, PlusIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type Notebook from "~/models/Notebook";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import NotebookMenu from "~/menus/NotebookMenu";
import {
  notebookEditPath,
  notebookPath,
  newNotePath,
} from "~/utils/routeHelpers";
import useCurrentUser from "~/hooks/useCurrentUser";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { NotebookTab } from "./Navigation";
import lazyWithRetry from "~/utils/lazyWithRetry";
import history from "~/utils/history";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { useCallback } from "react";
const ShareButton = lazyWithRetry(() => import("./ShareButton"));
type Props = {
  /** The collection for which to render actions */
  notebook: Notebook;
  /** Whether the collection is in editing mode */
  isEditing: boolean;
  /** Contextual information for the sidebar */
  sidebarContext: SidebarContextType;
};
function Actions({ notebook, isEditing, sidebarContext }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(notebook);
  const user = useCurrentUser();
  const goToEdit = useCallback(() => {
    history.push({
      pathname: notebookEditPath(notebook),
      state: { sidebarContext },
    });
  }, [notebook, sidebarContext]);
  const goBack = useCallback(() => {
    history.push({
      pathname: notebookPath(notebook, NotebookTab.Overview),
      state: { sidebarContext },
    });
  }, [notebook, sidebarContext]);
  return (
    <>
      {(!isEditing || !user?.separateEditMode) && (
        <Action>
          <ShareButton notebook={notebook} />
        </Action>
      )}
      {!isEditing && user?.separateEditMode && (
        <Action>
          <RegisterKeyDown trigger="e" handler={goToEdit} />
          <Tooltip content={t("Edit notebook")} shortcut="e" placement="bottom">
            <Button icon={<EditIcon />} onClick={goToEdit} neutral>
              {t("Edit")}
            </Button>
          </Tooltip>
        </Action>
      )}
      {isEditing && user?.separateEditMode && (
        <Action>
          <RegisterKeyDown trigger="Escape" handler={goBack} />
          <Button onClick={goBack}>{t("Done editing")}</Button>
        </Action>
      )}
      {can.createNote && (
        <Action>
          <Tooltip content={t("New document")} shortcut="n" placement="bottom">
            <Button
              as={Link}
              to={notebook ? newNotePath(notebook.id) : ""}
              disabled={!notebook}
              icon={<PlusIcon />}
              neutral={isEditing}
            >
              {t("New doc")}
            </Button>
          </Tooltip>
        </Action>
      )}
      <Action>
        <NotebookMenu notebook={notebook} align="end" neutral />
      </Action>
    </>
  );
}
export default observer(Actions);
