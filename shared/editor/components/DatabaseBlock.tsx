import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "../../styles";
import type { Property, PropertyValue } from "../../types";
import { PropertyType } from "../../types";
import { sanitizeUrl } from "../../utils/urls";
import useIsMounted from "../../hooks/useIsMounted";
import useStores from "../../hooks/useStores";
import type { ComponentProps } from "../types";

const ROW_LIMIT = 25;

type Props = ComponentProps & {
  /** Callback to set the collection rendered by this block. */
  onChangeCollection: (collectionId: string) => void;
};

/**
 * Renders the inline database block: a read-only live table over the
 * documents of a database collection. When the block has no collection yet
 * (freshly inserted), it renders a picker of available databases.
 */
function DatabaseBlock({ node, isEditable, onChangeCollection }: Props) {
  const { t } = useTranslation();
  const { collections, documents } = useStores();
  const isMounted = useIsMounted();
  const { collectionId } = node.attrs;

  const [rowIds, setRowIds] = React.useState<string[]>();
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const schema: Property[] = collection?.dataSchema ?? [];

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

  const rows = (rowIds ?? [])
    .map((id: string) => documents.get(id))
    .filter(Boolean);

  return (
    <Container contentEditable={false}>
      <Header>
        <Title to={collection.path}>{collection.name}</Title>
      </Header>
      <ScrollContainer>
        <Grid>
          <thead>
            <tr>
              <HeaderCell $minWidth={180}>{t("Title")}</HeaderCell>
              {schema.map((property) => (
                <HeaderCell key={property.id}>{property.name}</HeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(
              (doc: {
                id: string;
                path: string;
                titleWithDefault: string;
                propertyValue: (id: string) => PropertyValue | undefined;
              }) => (
                <tr key={doc.id}>
                  <Cell>
                    <RowLink to={doc.path}>{doc.titleWithDefault}</RowLink>
                  </Cell>
                  {schema.map((property) => (
                    <Cell key={property.id}>
                      <Value
                        property={property}
                        value={doc.propertyValue(property.id)}
                      />
                    </Cell>
                  ))}
                </tr>
              )
            )}
            {rowIds && rows.length === 0 && (
              <tr>
                <EmptyCell colSpan={schema.length + 1}>
                  {t("No documents yet")}
                </EmptyCell>
              </tr>
            )}
          </tbody>
        </Grid>
      </ScrollContainer>
    </Container>
  );
}

const Value = observer(function Value_({
  property,
  value,
}: {
  property: Property;
  value: PropertyValue | undefined;
}) {
  const { users } = useStores();

  if (value === undefined || value === null) {
    return null;
  }

  switch (property.type) {
    case PropertyType.Checkbox:
      return <span>{value === true ? "✓" : ""}</span>;

    case PropertyType.Select: {
      const option = property.options?.find((item) => item.id === value);
      return option ? <Chip $color={option.color}>{option.name}</Chip> : null;
    }

    case PropertyType.MultiSelect: {
      if (!Array.isArray(value)) {
        return null;
      }
      return (
        <>
          {value.map((id) => {
            const option = property.options?.find((item) => item.id === id);
            return option ? (
              <Chip key={id} $color={option.color}>
                {option.name}
              </Chip>
            ) : null;
          })}
        </>
      );
    }

    case PropertyType.Url:
      return typeof value === "string" ? (
        <a href={sanitizeUrl(value)} target="_blank" rel="noreferrer nofollow">
          {value}
        </a>
      ) : null;

    case PropertyType.Person: {
      const user = typeof value === "string" ? users.get(value) : undefined;
      return <span>{user?.name ?? ""}</span>;
    }

    case PropertyType.Date:
      return <span>{typeof value === "string" ? value.slice(0, 10) : ""}</span>;

    default:
      return <span>{String(value)}</span>;
  }
});

const Container = styled.div`
  margin: 8px 0;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 8px 10px;
  border-bottom: 1px solid ${s("divider")};
`;

const Title = styled(Link)`
  font-weight: 500;
  color: ${s("text")};
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
  color: ${s("text")};

  &:hover {
    text-decoration: underline;
  }
`;

const Chip = styled.span<{ $color?: string }>`
  display: inline-block;
  background: ${(props) => props.$color ?? props.theme.backgroundSecondary};
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 13px;
  margin-right: 4px;
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

const PickerButton = styled.button`
  border: 1px solid ${(props) => props.theme.inputBorder};
  background: none;
  color: ${s("text")};
  border-radius: 12px;
  padding: 2px 10px;
  margin: 0 4px 4px 0;
  font-size: 13px;
  cursor: var(--pointer);
`;

export default observer(DatabaseBlock);
