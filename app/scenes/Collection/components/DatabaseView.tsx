import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import type { DataView, DataViewSort, FilterCondition } from "@shared/types";
import { DataViewType } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { isGroupableProperty } from "@shared/utils/properties";
import type Collection from "~/models/Collection";
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

type Props = {
  /** The database collection to render. */
  collection: Collection;
};

const PAGE_LIMIT = 100;

/**
 * The database area of a collection: a toolbar with a view switcher, filter
 * bar and row creation, plus the active layout — table, board, list or
 * gallery — over the collection's documents.
 */
function DatabaseView({ collection }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const can = usePolicy(collection);

  const [persistedType, setPersistedType] = usePersistedState<DataViewType>(
    `collection-view-type:${collection.id}`,
    DataViewType.Table
  );
  const [rows, setRows] = React.useState<Document[]>();
  const [sort, setSort] = React.useState<DataViewSort>();
  const [filter, setFilter] = React.useState<FilterCondition>();
  const [isCreating, setIsCreating] = React.useState(false);

  const schema = React.useMemo(
    () => collection.dataSchema ?? [],
    [collection.dataSchema]
  );
  const groupableProperties = schema.filter(isGroupableProperty);

  // the board view requires a groupable property to derive its columns from
  const viewType =
    persistedType === DataViewType.Board && groupableProperties.length === 0
      ? DataViewType.Table
      : persistedType;

  const savedBoardView = collection.viewOfType(DataViewType.Board);
  const savedGroupByProperty = savedBoardView?.groupBy
    ? collection.getProperty(savedBoardView.groupBy)
    : undefined;
  const groupByProperty =
    savedGroupByProperty && isGroupableProperty(savedGroupByProperty)
      ? savedGroupByProperty
      : groupableProperties[0];

  const load = React.useCallback(async () => {
    try {
      const results = await documents.fetchInDatabase({
        collectionId: collection.id,
        limit: PAGE_LIMIT,
        propertySorts: sort ? [sort] : undefined,
        filter: filter
          ? { conjunction: "and", conditions: [filter] }
          : undefined,
      });
      setRows(results);
    } catch (error) {
      toast.error(errToString(error));
    }
  }, [documents, collection.id, sort, filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSort = React.useCallback((propertyId: string) => {
    setSort((current) => {
      if (current?.propertyId !== propertyId) {
        return { propertyId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { propertyId, direction: "desc" };
      }
      return undefined;
    });
  }, []);

  const handleNewRow = React.useCallback(async () => {
    setIsCreating(true);
    try {
      const document = await documents.create(
        {
          title: "",
          collectionId: collection.id,
        },
        { publish: true }
      );
      history.push(document.path);
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setIsCreating(false);
    }
  }, [documents, collection.id, history]);

  const upsertView = React.useCallback(
    async (type: DataViewType, attrs: Partial<DataView>) => {
      const views: DataView[] = [...(collection.views ?? [])];
      const index = views.findIndex((view) => view.type === type);
      if (index >= 0) {
        views[index] = { ...views[index], ...attrs };
      } else {
        views.push({
          id: uuidv4(),
          name: defaultViewName(type),
          type,
          columns: [],
          sorts: [],
          ...attrs,
        });
      }
      try {
        await collection.save({ views });
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [collection]
  );

  const handleSwitchView = React.useCallback(
    (type: DataViewType) => {
      setPersistedType(type);

      // persist a saved view of this type so that other surfaces, such as the
      // inline database block, can reference it by id
      if (
        type !== DataViewType.Table &&
        can.update &&
        !collection.viewOfType(type)
      ) {
        void upsertView(
          type,
          type === DataViewType.Board && groupableProperties.length > 0
            ? { groupBy: groupableProperties[0].id }
            : {}
        );
      }
    },
    [setPersistedType, can.update, collection, upsertView, groupableProperties]
  );

  const handleChangeGroupBy = React.useCallback(
    (propertyId: string) => {
      void upsertView(DataViewType.Board, { groupBy: propertyId });
    },
    [upsertView]
  );

  if (!rows) {
    return <PlaceholderList count={5} />;
  }

  const viewTypes: { type: DataViewType; label: string }[] = [
    { type: DataViewType.Table, label: t("Table") },
    ...(groupableProperties.length > 0
      ? [{ type: DataViewType.Board, label: t("Board") }]
      : []),
    { type: DataViewType.List, label: t("List") },
    { type: DataViewType.Gallery, label: t("Gallery") },
  ];

  return (
    <Fade>
      <Toolbar align="center" gap={8}>
        <Switcher>
          {viewTypes.map(({ type, label }) => (
            <SwitcherButton
              key={type}
              type="button"
              onClick={() => handleSwitchView(type)}
              $active={viewType === type}
            >
              {label}
            </SwitcherButton>
          ))}
        </Switcher>
        <DatabaseTableFilter
          schema={schema}
          filter={filter}
          onChange={setFilter}
        />
        {viewType === DataViewType.Board &&
          groupByProperty &&
          groupableProperties.length > 1 &&
          can.update && (
            <InputSelect
              options={groupableProperties.map((property) => ({
                type: "item" as const,
                label: t("Group by {{ propertyName }}", {
                  propertyName: property.name,
                }),
                value: property.id,
              }))}
              value={groupByProperty.id}
              onChange={handleChangeGroupBy}
              label={t("Group by")}
              labelHidden
              short
            />
          )}
        {can.createDocument && (
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

      {viewType === DataViewType.Board && groupByProperty ? (
        <DatabaseBoard
          collection={collection}
          rows={rows}
          groupByProperty={groupByProperty}
        />
      ) : viewType === DataViewType.List ? (
        <DatabaseList
          collection={collection}
          rows={rows}
          hasFilter={!!filter}
        />
      ) : viewType === DataViewType.Gallery ? (
        <DatabaseGallery
          collection={collection}
          rows={rows}
          hasFilter={!!filter}
        />
      ) : (
        <DatabaseTable
          collection={collection}
          rows={rows}
          sort={sort}
          onSort={handleSort}
          hasFilter={!!filter}
        />
      )}
    </Fade>
  );
}

function defaultViewName(type: DataViewType): string {
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

const Switcher = styled.div`
  display: inline-flex;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 4px;
  overflow: hidden;
`;

const SwitcherButton = styled.button<{ $active: boolean }>`
  border: none;
  background: ${(props) =>
    props.$active ? props.theme.listItemHoverBackground : "none"};
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textSecondary};
  font-weight: ${(props) => (props.$active ? 500 : 400)};
  font-size: 14px;
  padding: 6px 12px;
  cursor: var(--pointer);

  &:not(:last-child) {
    border-right: 1px solid ${(props) => props.theme.inputBorder};
  }

  &:hover {
    color: ${(props) => props.theme.text};
  }
`;

export default observer(DatabaseView);
