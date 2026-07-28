import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import PropertyValueLabel from "@shared/editor/components/PropertyValueLabel";
import type { Property } from "@shared/types";
import type Document from "~/models/Document";

type Props = {
  /** The documents to render as cards, in order. */
  rows: Document[];
  /** The properties to display on cards, in order. */
  properties: Property[];
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
};

/**
 * Renders the documents of a database collection as a responsive card grid:
 * each card shows the document title and its property values stacked.
 */
function DatabaseGallery({ rows, properties, hasFilter }: Props) {
  const { t } = useTranslation();

  if (rows.length === 0) {
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
        />
      ))}
    </Grid>
  );
}

const GalleryCard = observer(function GalleryCard_({
  document,
  properties,
}: {
  document: Document;
  properties: Property[];
}) {
  return (
    <Card>
      <CardTitle to={document.path}>{document.titleWithDefault}</CardTitle>
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
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  padding: 12px;
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
