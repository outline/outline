import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataViewSort, FilterCondition } from "@shared/types";
import { errToString } from "@shared/utils/error";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import PropertyValueEditor from "~/components/DocumentProperties/PropertyValueEditor";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import PlaceholderList from "~/components/List/Placeholder";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DatabaseTableFilter from "./DatabaseTableFilter";

type Props = {
  /** The database collection to render as a table. */
  collection: Collection;
};

const PAGE_LIMIT = 100;

/**
 * Renders the documents of a database collection as a table: rows are
 * documents, columns are the properties from the collection's data schema.
 * Cells are editable in place, headers toggle sorting, and a filter bar
 * queries the server through documents.list.
 */
function DatabaseTable({ collection }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const can = usePolicy(collection);

  const [rows, setRows] = React.useState<Document[]>();
  const [sort, setSort] = React.useState<DataViewSort>();
  const [filter, setFilter] = React.useState<FilterCondition>();
  const [isCreating, setIsCreating] = React.useState(false);

  const schema = React.useMemo(
    () => collection.dataSchema ?? [],
    [collection.dataSchema]
  );

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

  if (!rows) {
    return <PlaceholderList count={5} />;
  }

  return (
    <Fade>
      <Toolbar align="center" gap={8}>
        <DatabaseTableFilter
          schema={schema}
          filter={filter}
          onChange={setFilter}
        />
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

      <ScrollContainer>
        <Grid>
          <thead>
            <tr>
              <HeaderCell as="th" $minWidth={220}>
                {t("Title")}
              </HeaderCell>
              {schema.map((property) => (
                <HeaderCell
                  as="th"
                  key={property.id}
                  onClick={() => handleSort(property.id)}
                  $sortable
                >
                  {property.name}
                  {sort?.propertyId === property.id
                    ? sort.direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </HeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((document) => (
              <DatabaseTableRow
                key={document.id}
                document={document}
                collection={collection}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <EmptyCell colSpan={schema.length + 1}>
                  {filter
                    ? t("No documents match the filter")
                    : t("No documents yet")}
                </EmptyCell>
              </tr>
            )}
          </tbody>
        </Grid>
      </ScrollContainer>
    </Fade>
  );
}

const DatabaseTableRow = observer(function DatabaseTableRow_({
  document,
  collection,
}: {
  document: Document;
  collection: Collection;
}) {
  const can = usePolicy(document);
  const schema = collection.dataSchema ?? [];

  const handleChange = async (
    propertyId: string,
    value: Parameters<Document["setProperty"]>[1]
  ) => {
    try {
      await document.setProperty(propertyId, value);
    } catch (error) {
      toast.error(errToString(error));
    }
  };

  return (
    <Row>
      <TitleCell>
        <TitleLink to={document.path}>{document.titleWithDefault}</TitleLink>
      </TitleCell>
      {schema.map((property) => (
        <Cell key={property.id}>
          <PropertyValueEditor
            property={property}
            value={document.propertyValue(property.id)}
            onChange={(value) => handleChange(property.id, value)}
            readOnly={!can.update}
          />
        </Cell>
      ))}
    </Row>
  );
});

const Toolbar = styled(Flex)`
  margin: 12px 0;
  flex-wrap: wrap;
`;

const ScrollContainer = styled.div`
  overflow-x: auto;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
`;

const Grid = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;
`;

const HeaderCell = styled.th<{ $sortable?: boolean; $minWidth?: number }>`
  text-align: left;
  font-weight: 500;
  color: ${s("textSecondary")};
  padding: 8px 10px;
  border-bottom: 1px solid ${s("divider")};
  white-space: nowrap;
  min-width: ${(props) => props.$minWidth ?? 140}px;
  user-select: none;
  ${(props) => (props.$sortable ? "cursor: var(--pointer);" : "")}

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }
`;

const Row = styled.tr`
  &:not(:last-child) td {
    border-bottom: 1px solid ${s("divider")};
  }
`;

const Cell = styled.td`
  padding: 2px 4px;
  vertical-align: middle;

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }
`;

const TitleCell = styled(Cell)`
  padding: 8px 10px;
`;

const TitleLink = styled(Link)`
  color: ${s("text")};
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyCell = styled.td`
  padding: 24px;
  text-align: center;
  color: ${s("textSecondary")};
`;

export default observer(DatabaseTable);
