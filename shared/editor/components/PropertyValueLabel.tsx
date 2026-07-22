import { observer } from "mobx-react";
import styled from "styled-components";
import type { Property, PropertyValue } from "../../types";
import { PropertyType } from "../../types";
import { sanitizeUrl } from "../../utils/urls";
import useStores from "../../hooks/useStores";

type Props = {
  /** The property definition the value belongs to. */
  property: Property;
  /** The document's value for the property. */
  value: PropertyValue | undefined;
};

/**
 * Renders a document property value read-only in a compact, typed form:
 * select options as colored chips, checkboxes as a check mark, people by
 * name, urls as sanitized links. Renders nothing for empty values.
 */
export const PropertyValueLabel = observer(function PropertyValueLabel_({
  property,
  value,
}: Props) {
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

const Chip = styled.span<{ $color?: string }>`
  display: inline-block;
  background: ${(props) => props.$color ?? props.theme.backgroundSecondary};
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 13px;
  margin-right: 4px;
`;

export default PropertyValueLabel;
