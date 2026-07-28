import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import type {
  DataView,
  DataViewSummaries,
  DataViewSort,
  FilterCondition,
  SummaryAggregation,
} from "@shared/types";
import { DataViewType } from "@shared/types";
import { errToString } from "@shared/utils/error";
import {
  isGroupableProperty,
  visiblePropertiesForView,
} from "@shared/utils/properties";
import type Database from "~/models/Database";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import { InputSelect } from "~/components/InputSelect";
import PlaceholderList from "~/components/List/Placeholder";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DatabaseBoard from "./DatabaseBoard";
import DatabaseGallery from "./DatabaseGallery";
import DatabaseList from "./DatabaseList";
import DatabaseTable from "./DatabaseTable";
import DatabaseTableFilter from "./DatabaseTableFilter";
import DatabaseViewProperties from "./DatabaseViewProperties";
import DatabaseSummaryBar from "./DatabaseSummaryBar";
import DatabaseViewTabs from "./DatabaseViewTabs";

type Props = {
  /** The database to render. */
  database: Database;
};

const PAGE_LIMIT = 100;
const NO_GROUPING = "";

/**
 * The body of a database: a tab bar of saved views, a toolbar for the active
 * view, the rows in that view's layout, and a summary footer.
 *
 * Sorting, filtering, grouping and column visibility all belong to the active
 * view and are persisted on it, so switching tabs switches the whole query
 * rather than only the layout.
 */
function DatabaseView({ database }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const can = usePolicy(database);

  const [persistedViewId, setPersistedViewId] = usePersistedState<
    string | undefined
  >(`database-view:${database.id}`, undefined);
  const [rows, setRows] = React.useState<Document[]>();
  const [summaries, setSummaries] = React.useState<DataViewSummaries>();
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const schema = React.useMemo(
    () => database.dataSchema ?? [],
    [database.dataSchema]
  );
  const groupableProperties = schema.filter(isGroupableProperty);

  const activeView = database.resolveView(persistedViewId);
  const visibleProperties = visiblePropertiesForView(schema, activeView);

  const sort: DataViewSort | undefined = activeView?.sorts?.[0];
  const filter = activeView?.filter?.conditions?.[0] as
    | FilterCondition
    | undefined;

  const groupByProperty = activeView?.groupBy
    ? database.getProperty(activeView.groupBy)
    : undefined;
  const boardGroupByProperty =
    groupByProperty && isGroupableProperty(groupByProperty)
      ? groupByProperty
      : groupableProperties[0];

  const viewType =
    activeView?.type === DataViewType.Board && groupableProperties.length === 0
      ? DataViewType.Table
      : (activeView?.type ?? DataViewType.Table);

  const query = React.useCallback(
    (offset: number) =>
      documents.fetchInDatabase({
        databaseId: database.id,
        limit: PAGE_LIMIT,
        offset,
        propertySorts: activeView?.sorts?.length ? activeView.sorts : undefined,
        filter: activeView?.filter,
        summariesForViewId: activeView?.id,
      }),
    [documents, database.id, activeView]
  );

  React.useEffect(() => {
    let stale = false;
    async function load() {
      try {
        const result = await query(0);
        if (!stale) {
          setRows(result.rows);
          setSummaries(result.summaries);
          setHasMore(result.rows.length === PAGE_LIMIT);
        }
      } catch (error) {
        toast.error(errToString(error));
      }
    }
    void load();
    return () => {
      stale = true;
    };
  }, [query]);

  const handleLoadMore = React.useCallback(async () => {
    if (!rows) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const result = await query(rows.length);
      setRows((current) => [...(current ?? []), ...result.rows]);
      setHasMore(result.rows.length === PAGE_LIMIT);
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [rows, query]);

  const updateActiveView = React.useCallback(
    async (attrs: Partial<DataView>) => {
      if (!activeView) {
        return;
      }
      const views = (database.views ?? []).map((view) =>
        view.id === activeView.id ? { ...view, ...attrs } : view
      );
      try {
        await database.save({ views });
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [database, activeView]
  );

  const handleSort = React.useCallback(
    (propertyId: string) => {
      const current = activeView?.sorts?.[0];
      const next: DataViewSort[] =
        current?.propertyId !== propertyId
          ? [{ propertyId, direction: "asc" }]
          : current.direction === "asc"
            ? [{ propertyId, direction: "desc" }]
            : [];
      void updateActiveView({ sorts: next });
    },
    [activeView, updateActiveView]
  );

  const handleFilter = React.useCallback(
    (condition?: FilterCondition) => {
      void updateActiveView({
        filter: condition
          ? { conjunction: "and", conditions: [condition] }
          : undefined,
      });
    },
    [updateActiveView]
  );

  const handleNewRow = React.useCallback(async () => {
    setIsCreating(true);
    try {
      const document = await documents.create(
        {
          title: "",
          collectionId: database.collectionId,
          databaseId: database.id,
        },
        { publish: true }
      );
      history.push(document.path);
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setIsCreating(false);
    }
  }, [documents, database, history]);

  const handleCreateView = React.useCallback(
    async (type: DataViewType) => {
      const id = uuidv4();
      const existing = (database.views ?? []).filter(
        (view) => view.type === type
      ).length;
      const name =
        existing > 0
          ? `${viewTypeName(type)} ${existing + 1}`
          : viewTypeName(type);
      const view = database.buildView(type, name, id);
      if (type === DataViewType.Board && groupableProperties.length > 0) {
        view.groupBy = groupableProperties[0].id;
      }
      try {
        await database.save({ views: [...(database.views ?? []), view] });
        setPersistedViewId(id);
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [database, groupableProperties, setPersistedViewId]
  );

  const handleRenameView = React.useCallback(
    async (viewId: string, name: string) => {
      const views = (database.views ?? []).map((view) =>
        view.id === viewId ? { ...view, name } : view
      );
      try {
        await database.save({ views });
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [database]
  );

  const handleDeleteView = React.useCallback(
    async (viewId: string) => {
      const views = (database.views ?? []).filter((view) => view.id !== viewId);
      if (views.length === 0) {
        return;
      }
      try {
        await database.save({ views });
        if (persistedViewId === viewId) {
          setPersistedViewId(views[0].id);
        }
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [database, persistedViewId, setPersistedViewId]
  );

  const handleToggleProperty = React.useCallback(
    (propertyId: string, visible: boolean) => {
      const columns = [...(activeView?.columns ?? [])];
      const index = columns.findIndex(
        (column) => column.propertyId === propertyId
      );
      if (index >= 0) {
        columns[index] = { ...columns[index], visible };
      } else {
        columns.push({ propertyId, visible });
      }
      void updateActiveView({ columns });
    },
    [activeView, updateActiveView]
  );

  const handleChangeSummary = React.useCallback(
    (propertyId: string, summary: SummaryAggregation | null) => {
      const columns = [...(activeView?.columns ?? [])];
      const index = columns.findIndex(
        (column) => column.propertyId === propertyId
      );
      const next = summary ?? undefined;
      if (index >= 0) {
        columns[index] = { ...columns[index], summary: next };
      } else {
        columns.push({ propertyId, visible: true, summary: next });
      }
      void updateActiveView({ columns });
    },
    [activeView, updateActiveView]
  );

  const handleChangeGroupBy = React.useCallback(
    (propertyId: string) => {
      void updateActiveView({
        groupBy: propertyId === NO_GROUPING ? undefined : propertyId,
      });
    },
    [updateActiveView]
  );

  if (!rows) {
    return <PlaceholderList count={5} />;
  }

  return (
    <Fade>
      <DatabaseViewTabs
        views={database.views ?? []}
        activeViewId={activeView?.id}
        canEdit={can.update}
        onSelect={setPersistedViewId}
        onCreate={handleCreateView}
        onRename={handleRenameView}
        onDelete={handleDeleteView}
      />

      <Toolbar align="center" gap={8}>
        <DatabaseTableFilter
          schema={schema}
          filter={filter}
          onChange={handleFilter}
        />
        {(viewType === DataViewType.Board || viewType === DataViewType.List) &&
          groupableProperties.length > 0 &&
          can.update && (
            <InputSelect
              options={[
                ...(viewType === DataViewType.List
                  ? [
                      {
                        type: "item" as const,
                        label: t("No grouping"),
                        value: NO_GROUPING,
                      },
                    ]
                  : []),
                ...groupableProperties.map((property) => ({
                  type: "item" as const,
                  label: t("Group by {{ propertyName }}", {
                    propertyName: property.name,
                  }),
                  value: property.id,
                })),
              ]}
              value={activeView?.groupBy ?? NO_GROUPING}
              onChange={handleChangeGroupBy}
              label={t("Group by")}
              labelHidden
              short
            />
          )}
        {can.update && schema.length > 0 && (
          <DatabaseViewProperties
            schema={schema}
            view={activeView}
            onToggle={handleToggleProperty}
          />
        )}
        {can.createRow && (
          <Button
            type="button"
            onClick={handleNewRow}
            disabled={isCreating}
            icon={<PlusIcon />}
            neutral
          >
            {t("New row")}
          </Button>
        )}
      </Toolbar>

      {viewType === DataViewType.Board && boardGroupByProperty ? (
        <DatabaseBoard
          rows={rows}
          properties={visibleProperties}
          groupByProperty={boardGroupByProperty}
        />
      ) : viewType === DataViewType.List ? (
        <DatabaseList
          rows={rows}
          properties={visibleProperties}
          groupByProperty={
            groupByProperty && isGroupableProperty(groupByProperty)
              ? groupByProperty
              : undefined
          }
          hasFilter={!!filter}
        />
      ) : viewType === DataViewType.Gallery ? (
        <DatabaseGallery
          rows={rows}
          properties={visibleProperties}
          hasFilter={!!filter}
        />
      ) : (
        <DatabaseTable
          rows={rows}
          properties={visibleProperties}
          sort={sort}
          onSort={handleSort}
          hasFilter={!!filter}
        />
      )}

      {viewType === DataViewType.Table && (
        <DatabaseSummaryBar
          properties={visibleProperties}
          view={activeView}
          summaries={summaries}
          canEdit={can.update}
          onChange={handleChangeSummary}
        />
      )}

      {hasMore && (
        <LoadMore align="center" justify="center">
          <Button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            neutral
          >
            {t("Load more")}
          </Button>
        </LoadMore>
      )}
    </Fade>
  );
}

/** The default display name for a newly created view of the given layout. */
function viewTypeName(type: DataViewType): string {
  switch (type) {
    case DataViewType.Board:
      return "Board";
    case DataViewType.List:
      return "List";
    case DataViewType.Gallery:
      return "Gallery";
    default:
      return "Table";
  }
}

const Toolbar = styled(Flex)`
  margin: 12px 0;
  flex-wrap: wrap;
`;

const LoadMore = styled(Flex)`
  margin: 12px 0;
`;

export default observer(DatabaseView);
