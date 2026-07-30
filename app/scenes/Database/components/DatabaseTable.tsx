import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataViewSort, Property, PropertyOption } from "@shared/types";
import { errToString } from "@shared/utils/error";
import type Document from "~/models/Document";
import PropertyValueEditor from "~/components/DocumentProperties/PropertyValueEditor";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import usePolicy from "~/hooks/usePolicy";
import DatabaseAddProperty from "./DatabaseAddProperty";
import DatabasePropertyMenu from "./DatabasePropertyMenu";
import RowTitleInput from "./RowTitleInput";

type Props = {
  /** The documents to render as rows, in order. */
  rows: Document[];
  /** The properties to render as columns, in order. */
  properties: Property[];
  /** The active sort, reflected in the column headers. */
  sort?: DataViewSort;
  /** Callback when a sort direction is chosen for a property; null clears. */
  onSetSort: (propertyId: string, direction: "asc" | "desc" | null) => void;
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
  /** Callback to create a new row; absent when the user cannot create rows. */
  onNewRow?: () => void;
  /** The id of a freshly created row whose title is being typed inline. */
  newRowId?: string;
  /** Callback when the inline title editing of a new row has finished. */
  onNewRowDone: () => void;
  /** All property names in the schema, to derive unique names when adding. */
  schemaNames: string[];
  /** Callback to append a property to the schema; absent when not allowed. */
  onAddProperty?: (property: Property) => Promise<void>;
  /** Callback merging updates into a property; absent when not allowed. */
  onUpdateProperty?: (propertyId: string, updates: Partial<Property>) => void;
  /** Callback hiding a property from the active view. */
  onHideProperty: (propertyId: string) => void;
  /** Callback removing a property from the schema. */
  onDeleteProperty: (propertyId: string) => void;
  /** The property-visibility toggle to render beside the add button. */
  propertiesToggle?: React.ReactNode;
};

/**
 * Renders the documents of a database collection as a table: rows are
 * documents, columns are the properties from the collection's data schema.
 * Cells are editable in place, clicking a column header opens the property's
 * settings menu, a trailing "+" adds new properties and a footer row adds
 * new rows.
 */
function DatabaseTable({
  rows,
  properties,
  sort,
  onSetSort,
  hasFilter,
  onNewRow,
  newRowId,
  onNewRowDone,
  schemaNames,
  onAddProperty,
  onUpdateProperty,
  onHideProperty,
  onDeleteProperty,
  propertiesToggle,
}: Props) {
  const { t } = useTranslation();
  const hasControlsColumn = !!onAddProperty || !!propertiesToggle;
  const columnCount = properties.length + 1 + (hasControlsColumn ? 1 : 0);

  return (
    <ScrollContainer>
      <Grid>
        <thead>
          <tr>
            <HeaderCell as="th" $minWidth={220}>
              {t("Title")}
            </HeaderCell>
            {properties.map((property) => {
              const headerContent = (
                <>
                  {property.name}
                  {sort?.propertyId === property.id
                    ? sort.direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </>
              );
              return (
                <HeaderCell as="th" key={property.id}>
                  {onUpdateProperty ? (
                    <DatabasePropertyMenu
                      property={property}
                      sort={sort}
                      onRename={(name) =>
                        onUpdateProperty(property.id, { name })
                      }
                      onSetSort={(direction) =>
                        onSetSort(property.id, direction)
                      }
                      onHide={() => onHideProperty(property.id)}
                      onChangeOptions={(options: PropertyOption[]) =>
                        onUpdateProperty(property.id, { options })
                      }
                      onDelete={() => onDeleteProperty(property.id)}
                    >
                      {headerContent}
                    </DatabasePropertyMenu>
                  ) : (
                    headerContent
                  )}
                </HeaderCell>
              );
            })}
            {hasControlsColumn && (
              <ControlsCell as="th">
                <Flex align="center" gap={2}>
                  {onAddProperty && (
                    <DatabaseAddProperty
                      existingNames={schemaNames}
                      onAdd={onAddProperty}
                    />
                  )}
                  {propertiesToggle}
                </Flex>
              </ControlsCell>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((document) => (
            <DatabaseTableRow
              key={document.id}
              document={document}
              properties={properties}
              isEditingTitle={document.id === newRowId}
              onTitleDone={onNewRowDone}
              hasControlsColumn={hasControlsColumn}
            />
          ))}
          {rows.length === 0 && !onNewRow && (
            <tr>
              <EmptyCell colSpan={columnCount}>
                {hasFilter
                  ? t("No documents match the filter")
                  : t("No documents yet")}
              </EmptyCell>
            </tr>
          )}
          {onNewRow && (
            <tr>
              <NewRowCell colSpan={columnCount}>
                <NewRowButton
                  type="button"
                  onClick={onNewRow}
                  width="100%"
                  height={32}
                >
                  <PlusIcon size={18} />
                  {t("New row")}
                </NewRowButton>
              </NewRowCell>
            </tr>
          )}
        </tbody>
      </Grid>
    </ScrollContainer>
  );
}

const DatabaseTableRow = observer(function DatabaseTableRow_({
  document,
  properties,
  isEditingTitle,
  onTitleDone,
  hasControlsColumn,
}: {
  document: Document;
  properties: Property[];
  isEditingTitle: boolean;
  onTitleDone: () => void;
  hasControlsColumn: boolean;
}) {
  const can = usePolicy(document);

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
        {isEditingTitle ? (
          <RowTitleInput document={document} onDone={onTitleDone} />
        ) : (
          <TitleLink to={document.path}>{document.titleWithDefault}</TitleLink>
        )}
      </TitleCell>
      {properties.map((property) => (
        <Cell key={property.id}>
          <PropertyValueEditor
            property={property}
            value={document.propertyValue(property.id)}
            onChange={(value) => handleChange(property.id, value)}
            readOnly={!can.update}
          />
        </Cell>
      ))}
      {hasControlsColumn && <Cell />}
    </Row>
  );
});

const ScrollContainer = styled.div`
  overflow-x: auto;
  border-top: 1px solid ${s("divider")};
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
  padding: 8px 10px;
  border-bottom: 1px solid ${s("divider")};
  white-space: nowrap;
  min-width: ${(props) => props.$minWidth ?? 140}px;
  user-select: none;

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }
`;

const ControlsCell = styled.th`
  border-bottom: 1px solid ${s("divider")};
  padding: 4px 6px;
  width: 60px;
  min-width: 60px;
  vertical-align: middle;
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

const NewRowCell = styled.td`
  padding: 2px 4px;
`;

const NewRowButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${s("textSecondary")};
  font-size: 14px;
  padding: 0 6px;
  justify-content: flex-start;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

export default observer(DatabaseTable);
