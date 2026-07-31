import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import PropertyValueLabel from "@shared/editor/components/PropertyValueLabel";
import type { Property } from "@shared/types";
import type Document from "~/models/Document";
import NudeButton from "~/components/NudeButton";
import DatabaseRowMenu from "./DatabaseRowMenu";
import RowTitleInput from "./RowTitleInput";

type Props = {
  /** The documents to render as cards, in order. */
  rows: Document[];
  /** The properties to display on cards, in order. */
  properties: Property[];
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
  /** Callback to create a new row; absent when the user cannot create rows. */
  onNewRow?: () => void;
  /** The id of a freshly created row whose title is being typed inline. */
  newRowId?: string;
  /** Callback when the inline title editing of a new row has finished. */
  onNewRowDone: () => void;
  /** Callback deleting a row; absent when the user may not delete rows. */
  onDeleteRow?: (document: Document) => void;
};

/**
 * Renders the documents of a database collection as a responsive card grid:
 * each card shows the document title and its property values stacked.
 */
function DatabaseGallery({
  rows,
  properties,
  hasFilter,
  onNewRow,
  newRowId,
  onNewRowDone,
  onDeleteRow,
}: Props) {
  const { t } = useTranslation();

  if (rows.length === 0 && !onNewRow) {
    return (
      <Empty>
        {hasFilter ? t("No documents match the filter") : t("No documents yet")}
      </Empty>
    );
  }

  return (
    <Grid>
      {rows.map((document) => (
        <GalleryCard
          key={document.id}
          document={document}
          properties={properties}
          isEditingTitle={document.id === newRowId}
          onTitleDone={onNewRowDone}
          onDelete={onDeleteRow}
        />
      ))}
      {onNewRow && (
        <NewCardButton type="button" onClick={onNewRow} width="100%">
          <PlusIcon size={18} />
          {t("New row")}
        </NewCardButton>
      )}
    </Grid>
  );
}

const GalleryCard = observer(function GalleryCard_({
  document,
  properties,
  isEditingTitle,
  onTitleDone,
  onDelete,
}: {
  document: Document;
  properties: Property[];
  isEditingTitle: boolean;
  onTitleDone: () => void;
  onDelete?: (document: Document) => void;
}) {
  return (
    <Card>
      {onDelete && (
        <CardMenu>
          <DatabaseRowMenu document={document} onDelete={onDelete} />
        </CardMenu>
      )}
      {isEditingTitle ? (
        <RowTitleInput document={document} onDone={onTitleDone} />
      ) : (
        <CardTitle to={document.path}>{document.titleWithDefault}</CardTitle>
      )}
      {properties.map((property) => {
        const value = document.propertyValue(property.id);
        if (value === undefined || value === null) {
          return null;
        }
        return (
          <CardRow key={property.id}>
            <CardLabel>{property.name}</CardLabel>
            <CardValue>
              <PropertyValueLabel property={property} value={value} />
            </CardValue>
          </CardRow>
        );
      })}
    </Card>
  );
});

const Grid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  ${breakpoint("mobileLarge")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `};

  ${breakpoint("tablet")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};
`;

const Card = styled.div`
  position: relative;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  padding: 12px;
`;

/** The card's overflow menu, kept out of the way until the card is pointed at. */
const CardMenu = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  ${Card}:hover &,
  &:focus-within {
    opacity: 1;
  }
`;

const CardTitle = styled(Link)`
  display: block;
  color: ${s("text")};
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;

  &:hover {
    text-decoration: underline;
  }
`;

const NewCardButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed ${s("divider")};
  border-radius: 8px;
  padding: 12px;
  min-height: 48px;
  height: auto;
  color: ${s("textSecondary")};
  font-size: 14px;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

const CardRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
`;

const CardLabel = styled.span`
  color: ${s("textTertiary")};
  flex: 0 0 auto;
`;

const CardValue = styled.span`
  color: ${s("textSecondary")};
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Empty = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: ${s("textSecondary")};
`;

export default observer(DatabaseGallery);
