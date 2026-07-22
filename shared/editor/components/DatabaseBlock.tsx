import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "../../styles";
import type { DataView, Property, PropertyValue } from "../../types";
import { DataViewType } from "../../types";
import { groupByProperty, isGroupableProperty } from "../../utils/properties";
import useIsMounted from "../../hooks/useIsMounted";
import useStores from "../../hooks/useStores";
import type { ComponentProps } from "../types";
import PropertyValueLabel from "./PropertyValueLabel";

const ROW_LIMIT = 25;

type Props = ComponentProps & {
  /** Callback to set the collection rendered by this block. */
  onChangeCollection: (collectionId: string) => void;
  /** Callback to set the saved view rendered by this block. */
  onChangeView: (viewId: string | null) => void;
};

type RowModel = {
  id: string;
  path: string;
  titleWithDefault: string;
  propertyValue: (id: string) => PropertyValue | undefined;
};

/**
 * Renders the inline database block: a read-only live view over the
 * documents of a database collection, laid out as a table, board, list or
 * gallery depending on the referenced saved view. When the block has no
 * collection yet (freshly inserted), it renders a picker of available
 * databases.
 */
function DatabaseBlock({
  node,
  isEditable,
  onChangeCollection,
  onChangeView,
}: Props) {
  const { t } = useTranslation();
  const { collections, documents } = useStores();
  const isMounted = useIsMounted();
  const { collectionId, viewId } = node.attrs;

  const [rowIds, setRowIds] = React.useState<string[]>();
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const schema: Property[] = collection?.dataSchema ?? [];
  const views: DataView[] = collection?.views ?? [];
  const view = viewId
    ? views.find((item: DataView) => item.id === viewId)
    : undefined;
  const viewType = view?.type ?? DataViewType.Table;

  React.useEffect(() => {
    if (!collectionId) {
      return;
    }

    async function load() {
      try {
        if (!collections.get(collectionId)) {
          await collections.fetch(collectionId);
        }
        const results = await documents.fetchInDatabase({
          collectionId,
          limit: ROW_LIMIT,
        });
        if (isMounted()) {
          setRowIds(results.map((doc: { id: string }) => doc.id));
        }
      } catch (_err) {
        if (isMounted()) {
          setRowIds([]);
        }
      }
    }

    void load();
  }, [collectionId, collections, documents, isMounted]);

  if (!collectionId) {
    const databases = collections.orderedData.filter(
      (item: { isDatabase: boolean }) => item.isDatabase
    );
    return (
      <Container contentEditable={false}>
        <Placeholder>
          {isEditable && databases.length > 0 ? (
            <>
              {t("Choose a database")}:{" "}
              {databases.map((item: { id: string; name: string }) => (
                <PickerButton
                  key={item.id}
                  type="button"
                  onClick={() => onChangeCollection(item.id)}
                >
                  {item.name}
                </PickerButton>
              ))}
            </>
          ) : (
            t("No database selected")
          )}
        </Placeholder>
      </Container>
    );
  }

  if (!collection) {
    return (
      <Container contentEditable={false}>
        <Placeholder>{t("Database not accessible")}</Placeholder>
      </Container>
    );
  }

  const rows: RowModel[] = (rowIds ?? [])
    .map((id: string) => documents.get(id))
    .filter(Boolean);
  const isEmpty = rowIds !== undefined && rows.length === 0;

  return (
    <Container contentEditable={false}>
      <Header>
        <Title to={collection.path}>{collection.name}</Title>
        {isEditable && views.length > 0 && (
          <ViewPicker>
            <PickerButton
              type="button"
              onClick={() => onChangeView(null)}
              $active={!view}
            >
              {t("Table")}
            </PickerButton>
            {views.map((item: DataView) => (
              <PickerButton
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                $active={view?.id === item.id}
              >
                {item.name}
              </PickerButton>
            ))}
          </ViewPicker>
        )}
      </Header>
      {viewType === DataViewType.Board ? (
        <BlockBoard
          rows={rows}
          schema={schema}
          view={view}
          isEmpty={isEmpty}
          emptyLabel={t("No documents yet")}
          noValueLabel={t("No value")}
        />
      ) : viewType === DataViewType.List ? (
        <BlockList
          rows={rows}
          schema={schema}
          isEmpty={isEmpty}
          emptyLabel={t("No documents yet")}
        />
      ) : viewType === DataViewType.Gallery ? (
        <BlockGallery
          rows={rows}
          schema={schema}
          isEmpty={isEmpty}
          emptyLabel={t("No documents yet")}
        />
      ) : (
        <BlockTable
          rows={rows}
          schema={schema}
          isEmpty={isEmpty}
          emptyLabel={t("No documents yet")}
          titleLabel={t("Title")}
        />
      )}
    </Container>
  );
}

const BlockTable = observer(function BlockTable_({
  rows,
  schema,
  isEmpty,
  emptyLabel,
  titleLabel,
}: {
  rows: RowModel[];
  schema: Property[];
  isEmpty: boolean;
  emptyLabel: string;
  titleLabel: string;
}) {
  return (
    <ScrollContainer>
      <Grid>
        <thead>
          <tr>
            <HeaderCell $minWidth={180}>{titleLabel}</HeaderCell>
            {schema.map((property) => (
              <HeaderCell key={property.id}>{property.name}</HeaderCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.id}>
              <Cell>
                <RowLink to={doc.path}>{doc.titleWithDefault}</RowLink>
              </Cell>
              {schema.map((property) => (
                <Cell key={property.id}>
                  <PropertyValueLabel
                    property={property}
                    value={doc.propertyValue(property.id)}
                  />
                </Cell>
              ))}
            </tr>
          ))}
          {isEmpty && (
            <tr>
              <EmptyCell colSpan={schema.length + 1}>{emptyLabel}</EmptyCell>
            </tr>
          )}
        </tbody>
      </Grid>
    </ScrollContainer>
  );
});

const BlockBoard = observer(function BlockBoard_({
  rows,
  schema,
  view,
  isEmpty,
  emptyLabel,
  noValueLabel,
}: {
  rows: RowModel[];
  schema: Property[];
  view?: DataView;
  isEmpty: boolean;
  emptyLabel: string;
  noValueLabel: string;
}) {
  const configured = view?.groupBy
    ? schema.find((item) => item.id === view.groupBy)
    : undefined;
  const property =
    configured && isGroupableProperty(configured)
      ? configured
      : schema.find(isGroupableProperty);

  if (!property) {
    return <Placeholder>{emptyLabel}</Placeholder>;
  }
  if (isEmpty) {
    return <Placeholder>{emptyLabel}</Placeholder>;
  }

  const groups = groupByProperty(rows, property, (doc) =>
    doc.propertyValue(property.id)
  );
  const cardProperties = schema.filter((item) => item.id !== property.id);

  return (
    <ScrollContainer>
      <Columns>
        {groups.map((group) => (
          <Column key={group.option?.id ?? "none"}>
            <ColumnHeader>
              {group.option ? (
                <Chip $color={group.option.color}>{group.option.name}</Chip>
              ) : (
                <MutedLabel>{noValueLabel}</MutedLabel>
              )}
              <MutedLabel>{group.items.length}</MutedLabel>
            </ColumnHeader>
            {group.items.map((doc) => (
              <BoardCard key={doc.id}>
                <RowLink to={doc.path}>{doc.titleWithDefault}</RowLink>
                {cardProperties.map((item) => {
                  const value = doc.propertyValue(item.id);
                  if (value === undefined || value === null) {
                    return null;
                  }
                  return (
                    <CardValue key={item.id}>
                      <PropertyValueLabel property={item} value={value} />
                    </CardValue>
                  );
                })}
              </BoardCard>
            ))}
          </Column>
        ))}
      </Columns>
    </ScrollContainer>
  );
});

const BlockList = observer(function BlockList_({
  rows,
  schema,
  isEmpty,
  emptyLabel,
}: {
  rows: RowModel[];
  schema: Property[];
  isEmpty: boolean;
  emptyLabel: string;
}) {
  if (isEmpty) {
    return <Placeholder>{emptyLabel}</Placeholder>;
  }
  return (
    <div>
      {rows.map((doc) => (
        <ListRow key={doc.id}>
          <RowLink to={doc.path}>{doc.titleWithDefault}</RowLink>
          <ListValues>
            {schema.map((property) => {
              const value = doc.propertyValue(property.id);
              if (value === undefined || value === null) {
                return null;
              }
              return (
                <span key={property.id}>
                  <PropertyValueLabel property={property} value={value} />
                </span>
              );
            })}
          </ListValues>
        </ListRow>
      ))}
    </div>
  );
});

const BlockGallery = observer(function BlockGallery_({
  rows,
  schema,
  isEmpty,
  emptyLabel,
}: {
  rows: RowModel[];
  schema: Property[];
  isEmpty: boolean;
  emptyLabel: string;
}) {
  if (isEmpty) {
    return <Placeholder>{emptyLabel}</Placeholder>;
  }
  return (
    <GalleryGrid>
      {rows.map((doc) => (
        <GalleryCard key={doc.id}>
          <RowLink to={doc.path}>{doc.titleWithDefault}</RowLink>
          {schema.map((property) => {
            const value = doc.propertyValue(property.id);
            if (value === undefined || value === null) {
              return null;
            }
            return (
              <CardValue key={property.id}>
                <MutedLabel>{property.name}</MutedLabel>{" "}
                <PropertyValueLabel property={property} value={value} />
              </CardValue>
            );
          })}
        </GalleryCard>
      ))}
    </GalleryGrid>
  );
});

const Container = styled.div`
  margin: 8px 0;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-bottom: 1px solid ${s("divider")};
`;

const Title = styled(Link)`
  font-weight: 500;
  color: ${s("text")};
`;

const ViewPicker = styled.span`
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const ScrollContainer = styled.div`
  overflow-x: auto;
`;

const Grid = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;
`;

const HeaderCell = styled.th<{ $minWidth?: number }>`
  text-align: left;
  font-weight: 500;
  color: ${s("textSecondary")};
  padding: 6px 10px;
  border-bottom: 1px solid ${s("divider")};
  white-space: nowrap;
  min-width: ${(props) => props.$minWidth ?? 120}px;

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }
`;

const Cell = styled.td`
  padding: 6px 10px;
  vertical-align: middle;

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }

  tr:not(:last-child) & {
    border-bottom: 1px solid ${s("divider")};
  }
`;

const RowLink = styled(Link)`
  display: inline-block;
  color: ${s("text")};

  &:hover {
    text-decoration: underline;
  }
`;

const Columns = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
`;

const Column = styled.div`
  flex: 0 0 200px;
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  padding: 6px;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`;

const BoardCard = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;

  &:not(:last-child) {
    margin-bottom: 6px;
  }
`;

const CardValue = styled.div`
  font-size: 12px;
  color: ${s("textSecondary")};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px 10px;
  font-size: 14px;

  &:not(:last-child) {
    border-bottom: 1px solid ${s("divider")};
  }
`;

const ListValues = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${s("textSecondary")};
`;

const GalleryGrid = styled.div`
  display: grid;
  gap: 8px;
  padding: 8px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
`;

const GalleryCard = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
`;

const Chip = styled.span<{ $color?: string }>`
  display: inline-block;
  background: ${(props) => props.$color ?? props.theme.backgroundSecondary};
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 13px;
`;

const MutedLabel = styled.span`
  color: ${s("textSecondary")};
  font-size: 12px;
`;

const EmptyCell = styled.td`
  padding: 16px;
  text-align: center;
  color: ${s("textSecondary")};
`;

const Placeholder = styled.div`
  padding: 16px;
  color: ${s("textSecondary")};
`;

const PickerButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${(props) => props.theme.inputBorder};
  background: ${(props) =>
    props.$active ? props.theme.backgroundSecondary : "none"};
  color: ${s("text")};
  border-radius: 12px;
  padding: 2px 10px;
  margin: 0 4px 4px 0;
  font-size: 13px;
  cursor: var(--pointer);
`;

export default observer(DatabaseBlock);
