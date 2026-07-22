import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataViewSort } from "@shared/types";
import { errToString } from "@shared/utils/error";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import PropertyValueEditor from "~/components/DocumentProperties/PropertyValueEditor";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  /** The database collection the rows belong to. */
  collection: Collection;
  /** The documents to render as rows, in order. */
  rows: Document[];
  /** The active sort, reflected in the column headers. */
  sort?: DataViewSort;
  /** Callback when a column header is clicked to change the sort. */
  onSort: (propertyId: string) => void;
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
};

/**
 * Renders the documents of a database collection as a table: rows are
 * documents, columns are the properties from the collection's data schema.
 * Cells are editable in place and headers toggle sorting.
 */
function DatabaseTable({ collection, rows, sort, onSort, hasFilter }: Props) {
  const { t } = useTranslation();
  const schema = collection.dataSchema ?? [];

  return (
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
                onClick={() => onSort(property.id)}
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
                {hasFilter
                  ? t("No documents match the filter")
                  : t("No documents yet")}
              </EmptyCell>
            </tr>
          )}
        </tbody>
      </Grid>
    </ScrollContainer>
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
