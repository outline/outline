import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type Notebook from "~/models/Notebook";
import { Tab, Tabs } from "~/components/Tabs";
import { notebookPath } from "~/utils/routeHelpers";
import { type SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
export enum NotebookTab {
  Overview = "overview",
  Recent = "recent",
  Popular = "popular",
  Updated = "updated",
  Published = "published",
  Old = "old",
  Alphabetical = "alphabetical",
}
type Props = {
  /** The collection for which to render navigation tabs */
  notebook: Notebook;
  /** Callback when the tab is changed */
  onChangeTab: (tab: NotebookTab) => void;
  /** Whether to show the overview tab */
  showOverview?: boolean;
  /** Contextual information for the sidebar */
  sidebarContext: SidebarContextType;
};
/**
 * Navigation component for collection tabs, providing navigation between
 * different views of collection notes.
 */
const Navigation = observer(function Navigation({
  notebook,
  onChangeTab,
  showOverview,
  sidebarContext,
}: Props) {
  const { t } = useTranslation();
  const tabProps = (path: NotebookTab) => ({
    exact: true,
    onClick: () => onChangeTab(path),
    to: {
      pathname: notebookPath(notebook, path),
      state: { sidebarContext },
    },
  });
  return (
    <Tabs>
      {showOverview && (
        <Tab {...tabProps(NotebookTab.Overview)} exact={false}>
          {t("Overview")}
        </Tab>
      )}
      <Tab {...tabProps(NotebookTab.Recent)}>{t("Notes")}</Tab>
      {!notebook.isArchived && (
        <>
          <Tab {...tabProps(NotebookTab.Popular)}>{t("Popular")}</Tab>
          <Tab {...tabProps(NotebookTab.Updated)}>{t("Recently updated")}</Tab>
          <Tab {...tabProps(NotebookTab.Published)}>
            {t("Recently published")}
          </Tab>
          <Tab {...tabProps(NotebookTab.Old)}>
            {t("Least recently updated")}
          </Tab>
          <Tab {...tabProps(NotebookTab.Alphabetical)}>{t("A–Z")}</Tab>
        </>
      )}
    </Tabs>
  );
});
export default Navigation;
