import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import Collection from "~/models/Collection";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import { collectionPath } from "~/utils/routeHelpers";
import { type SidebarContextType } from "~/components/Sidebar/components/SidebarContext";

export enum CollectionPath {
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
  collection: Collection;
  /** Callback when the tab is changed */
  onChangeTab: (tab: CollectionPath) => void;
  /** Whether to show the overview tab */
  showOverview?: boolean;
  /** Contextual information for the sidebar */
  sidebarContext: SidebarContextType;
};

/**
 * Navigation component for collection tabs, providing navigation between
 * different views of collection documents.
 */
const Navigation = observer(function Navigation({
  collection,
  onChangeTab,
  showOverview,
  sidebarContext,
}: Props) {
  const { t } = useTranslation();

  const tabProps = (path: CollectionPath) => ({
    exact: true,
    onClick: () => onChangeTab(path),
    to: {
      pathname: collectionPath(collection.path, path),
      state: { sidebarContext },
    },
  });

  return (
    <Tabs>
      {showOverview && (
        <Tab {...tabProps(CollectionPath.Overview)}>{t("Overview")}</Tab>
      )}
      <Tab {...tabProps(CollectionPath.Recent)}>{t("Documents")}</Tab>
      {!collection.isArchived && (
        <>
          <Tab {...tabProps(CollectionPath.Popular)}>{t("Popular")}</Tab>
          <Tab {...tabProps(CollectionPath.Updated)}>
            {t("Recently updated")}
          </Tab>
          <Tab {...tabProps(CollectionPath.Published)}>
            {t("Recently published")}
          </Tab>
          <Tab {...tabProps(CollectionPath.Old)}>
            {t("Least recently updated")}
          </Tab>
          <Tab {...tabProps(CollectionPath.Alphabetical)}>{t("A–Z")}</Tab>
        </>
      )}
    </Tabs>
  );
});

export default Navigation;
