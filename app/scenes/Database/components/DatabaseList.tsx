import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import PropertyValueLabel from "@shared/editor/components/PropertyValueLabel";
import type { Property } from "@shared/types";
import { groupByProperty } from "@shared/utils/properties";
import type Document from "~/models/Document";

type Props = {
  /** The documents to render, in order. */
  rows: Document[];
  /** The properties to display on each row, in order. */
  properties: Property[];
  /** Optional groupable property to split the list into sections. */
  groupByProperty?: Property;
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
};

/**
 * Renders the documents of a database collection as a compact stacked list:
 * each row shows the document title followed by its property values inline.
 * When a group property is configured the rows are split into sections, one
 * per option.
 */
function DatabaseList({
  rows,
  properties,
  groupByProperty: groupProperty,
  hasFilter,
}: Props) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <Empty>
        {hasFilter ? t("No documents match the filter") : t("No documents yet")}
      </Empty>
    );
  }

  if (!groupProperty) {
    return (
      <Container>
        {rows.map((document) => (
          <ListRow
            key={document.id}
            document={document}
            properties={properties}
          />
        ))}
      </Container>
    );
  }

  const groups = groupByProperty(rows, groupProperty, (document) =>
    document.propertyValue(groupProperty.id)
  ).filter((group) => group.items.length > 0);
  const rowProperties = properties.filter(
    (property) => property.id !== groupProperty.id
  );

  return (
    <>
      {groups.map((group) => (
        <Section key={group.option?.id ?? "none"}>
          <SectionHeader>
            {group.option ? (
              <Chip $color={group.option.color}>{group.option.name}</Chip>
            ) : (
              <MutedLabel>{t("No value")}</MutedLabel>
            )}
            <MutedLabel>{group.items.length}</MutedLabel>
          </SectionHeader>
          <Container>
            {group.items.map((document) => (
              <ListRow
                key={document.id}
                document={document}
                properties={rowProperties}
              />
            ))}
          </Container>
        </Section>
      ))}
    </>
  );
}

const ListRow = observer(function ListRow_({
  document,
  properties,
}: {
  document: Document;
  properties: Property[];
}) {
  return (
    <Row>
      <RowTitle to={document.path}>{document.titleWithDefault}</RowTitle>
      <RowValues>
        {properties.map((property) => {
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

const Section = styled.div`
  &:not(:last-child) {
    margin-bottom: 16px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`;

const Chip = styled.span<{ $color?: string }>`
  display: inline-block;
  background: ${(props) => props.$color ?? props.theme.backgroundSecondary};
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 500;
`;

const MutedLabel = styled.span`
  color: ${s("textSecondary")};
  font-size: 13px;
  font-weight: 500;
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
