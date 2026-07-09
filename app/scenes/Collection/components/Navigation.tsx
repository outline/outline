import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { TeamPreference } from "@shared/types";
import type Collection from "~/models/Collection";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { collectionPath } from "~/utils/routeHelpers";
import { type SidebarContextType } from "~/components/Sidebar/components/SidebarContext";

export enum CollectionTab {
  Overview = "overview",
  Recent = "recent",
  Popular = "popular",
  Updated = "updated",
  Published = "published",
  Old = "old",
  Alphabetical = "alphabetical",
  Table = "table",
}

type Props = {
  /** The collection for which to render navigation tabs */
  collection: Collection;
  /** Callback when the tab is changed */
  onChangeTab: (tab: CollectionTab) => void;
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
  const team = useCurrentTeam();
  const showTable =
    collection.isDatabase &&
    team.getPreference(TeamPreference.DocumentDatabases);

  const tabProps = (path: CollectionTab) => ({
    exact: true,
    onClick: () => onChangeTab(path),
    to: {
      pathname: collectionPath(collection, path),
      state: { sidebarContext },
    },
  });

  return (
    <Tabs>
      {showOverview && (
        <Tab {...tabProps(CollectionTab.Overview)} exact={false}>
          {t("Overview")}
        </Tab>
      )}
      <Tab {...tabProps(CollectionTab.Recent)}>{t("Documents")}</Tab>
      {showTable && !collection.isArchived && (
        <Tab {...tabProps(CollectionTab.Table)}>{t("Table")}</Tab>
      )}
      {!collection.isArchived && (
        <>
          <Tab {...tabProps(CollectionTab.Popular)}>{t("Popular")}</Tab>
          <Tab {...tabProps(CollectionTab.Updated)}>
            {t("Recently updated")}
          </Tab>
          <Tab {...tabProps(CollectionTab.Published)}>
            {t("Recently published")}
          </Tab>
          <Tab {...tabProps(CollectionTab.Old)}>
            {t("Least recently updated")}
          </Tab>
          <Tab {...tabProps(CollectionTab.Alphabetical)}>{t("A–Z")}</Tab>
        </>
      )}
    </Tabs>
  );
});

export default Navigation;
