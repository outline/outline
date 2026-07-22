import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import PropertyValueLabel from "@shared/editor/components/PropertyValueLabel";
import type { Property } from "@shared/types";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";

type Props = {
  /** The database collection the rows belong to. */
  collection: Collection;
  /** The documents to render, in order. */
  rows: Document[];
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
};

/**
 * Renders the documents of a database collection as a compact stacked list:
 * each row shows the document title followed by its property values inline.
 */
function DatabaseList({ collection, rows, hasFilter }: Props) {
  const { t } = useTranslation();
  const schema = collection.dataSchema ?? [];

  if (rows.length === 0) {
    return (
      <Empty>
        {hasFilter ? t("No documents match the filter") : t("No documents yet")}
      </Empty>
    );
  }

  return (
    <Container>
      {rows.map((document) => (
        <ListRow key={document.id} document={document} schema={schema} />
      ))}
    </Container>
  );
}

const ListRow = observer(function ListRow_({
  document,
  schema,
}: {
  document: Document;
  schema: Property[];
}) {
  return (
    <Row>
      <RowTitle to={document.path}>{document.titleWithDefault}</RowTitle>
      <RowValues>
        {schema.map((property) => {
          const value = document.propertyValue(property.id);
          if (value === undefined || value === null) {
            return null;
          }
          return (
            <RowValue key={property.id}>
              <PropertyValueLabel property={property} value={value} />
            </RowValue>
          );
        })}
      </RowValues>
    </Row>
  );
});

const Container = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  flex-wrap: wrap;

  &:not(:last-child) {
    border-bottom: 1px solid ${s("divider")};
  }
`;

const RowTitle = styled(Link)`
  color: ${s("text")};
  font-size: 14px;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const RowValues = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${s("textSecondary")};
`;

const RowValue = styled.span`
  display: inline-flex;
  align-items: center;
`;

const Empty = styled.div`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: ${s("textSecondary")};
`;

export default observer(DatabaseList);
