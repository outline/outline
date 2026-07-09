import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { FilterCondition, Property, PropertyValue } from "@shared/types";
import { FilterOperator, PropertyType } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { InputSelect } from "~/components/InputSelect";
import useStores from "~/hooks/useStores";

type Props = {
  /** The collection's data schema. */
  schema: Property[];
  /** The currently applied filter condition, if any. */
  filter?: FilterCondition;
  /** Callback with the new filter condition, or undefined to clear. */
  onChange: (filter?: FilterCondition) => void;
};

const NONE = "";

const operatorLabels: Record<FilterOperator, string> = {
  [FilterOperator.Is]: "Is",
  [FilterOperator.IsNot]: "Is not",
  [FilterOperator.Contains]: "Contains",
  [FilterOperator.DoesNotContain]: "Does not contain",
  [FilterOperator.IsEmpty]: "Is empty",
  [FilterOperator.IsNotEmpty]: "Is not empty",
  [FilterOperator.Gt]: "Greater than",
  [FilterOperator.Gte]: "At least",
  [FilterOperator.Lt]: "Less than",
  [FilterOperator.Lte]: "At most",
  [FilterOperator.Before]: "Before",
  [FilterOperator.After]: "After",
  [FilterOperator.On]: "On",
};

function operatorsForType(type: PropertyType): FilterOperator[] {
  switch (type) {
    case PropertyType.Select:
    case PropertyType.Person:
      return [
        FilterOperator.Is,
        FilterOperator.IsNot,
        FilterOperator.IsEmpty,
        FilterOperator.IsNotEmpty,
      ];
    case PropertyType.MultiSelect:
      return [
        FilterOperator.Contains,
        FilterOperator.DoesNotContain,
        FilterOperator.IsEmpty,
        FilterOperator.IsNotEmpty,
      ];
    case PropertyType.Checkbox:
      return [FilterOperator.Is];
    case PropertyType.Number:
      return [
        FilterOperator.Is,
        FilterOperator.Gt,
        FilterOperator.Gte,
        FilterOperator.Lt,
        FilterOperator.Lte,
        FilterOperator.IsEmpty,
        FilterOperator.IsNotEmpty,
      ];
    case PropertyType.Date:
      return [
        FilterOperator.Before,
        FilterOperator.After,
        FilterOperator.On,
        FilterOperator.IsEmpty,
        FilterOperator.IsNotEmpty,
      ];
    default:
      return [
        FilterOperator.Contains,
        FilterOperator.Is,
        FilterOperator.IsEmpty,
        FilterOperator.IsNotEmpty,
      ];
  }
}

const valuelessOperators = new Set<FilterOperator>([
  FilterOperator.IsEmpty,
  FilterOperator.IsNotEmpty,
]);

/**
 * A single-condition filter bar for the database table view: pick a
 * property, an operator valid for its type, and a comparison value.
 */
function DatabaseTableFilter({ schema, filter, onChange }: Props) {
  const { t } = useTranslation();
  const { users } = useStores();

  const property = schema.find((item) => item.id === filter?.propertyId);

  const handleProperty = (propertyId: string) => {
    if (propertyId === NONE) {
      onChange(undefined);
      return;
    }
    const next = schema.find((item) => item.id === propertyId);
    if (!next) {
      return;
    }
    const operator = operatorsForType(next.type)[0];
    onChange({
      propertyId,
      operator,
      value: defaultValue(next, operator),
    });
  };

  const handleOperator = (value: string) => {
    if (!filter || !property) {
      return;
    }
    const operator = operatorsForType(property.type).find(
      (item) => item === value
    );
    if (!operator) {
      return;
    }
    onChange({
      ...filter,
      operator,
      value: valuelessOperators.has(operator)
        ? undefined
        : (filter.value ?? defaultValue(property, operator)),
    });
  };

  const handleValue = (value: PropertyValue | undefined) => {
    if (!filter) {
      return;
    }
    onChange({ ...filter, value: value ?? undefined });
  };

  const renderValueInput = () => {
    if (!filter || !property || valuelessOperators.has(filter.operator)) {
      return null;
    }

    switch (property.type) {
      case PropertyType.Select:
      case PropertyType.MultiSelect:
        return (
          <InputSelect
            options={(property.options ?? []).map((option) => ({
              type: "item" as const,
              label: option.name,
              value: option.id,
            }))}
            value={typeof filter.value === "string" ? filter.value : null}
            onChange={handleValue}
            label={t("Value")}
            labelHidden
            short
          />
        );

      case PropertyType.Person:
        return (
          <InputSelect
            options={users.activeOrInvited.map((user) => ({
              type: "item" as const,
              label: user.name,
              value: user.id,
            }))}
            value={typeof filter.value === "string" ? filter.value : null}
            onChange={handleValue}
            label={t("Value")}
            labelHidden
            short
          />
        );

      case PropertyType.Checkbox:
        return (
          <InputSelect
            options={[
              { type: "item", label: t("Checked"), value: "true" },
              { type: "item", label: t("Unchecked"), value: "false" },
            ]}
            value={filter.value === false ? "false" : "true"}
            onChange={(value) => handleValue(value === "true")}
            label={t("Value")}
            labelHidden
            short
          />
        );

      case PropertyType.Number:
        return (
          <ValueInput
            type="number"
            defaultValue={
              typeof filter.value === "number" ? String(filter.value) : ""
            }
            onBlur={(ev) => {
              const parsed = Number(ev.target.value);
              handleValue(Number.isFinite(parsed) ? parsed : undefined);
            }}
          />
        );

      case PropertyType.Date:
        return (
          <ValueInput
            type="date"
            defaultValue={
              typeof filter.value === "string" ? filter.value.slice(0, 10) : ""
            }
            onBlur={(ev) => handleValue(ev.target.value || undefined)}
          />
        );

      default:
        return (
          <ValueInput
            type="text"
            defaultValue={typeof filter.value === "string" ? filter.value : ""}
            placeholder={t("Value")}
            onBlur={(ev) => handleValue(ev.target.value || undefined)}
          />
        );
    }
  };

  return (
    <Bar align="center" gap={8} auto>
      <InputSelect
        options={[
          { type: "item", label: t("No filter"), value: NONE },
          ...schema.map((item) => ({
            type: "item" as const,
            label: item.name,
            value: item.id,
          })),
        ]}
        value={filter?.propertyId ?? NONE}
        onChange={handleProperty}
        label={t("Filter by")}
        labelHidden
        short
      />
      {filter && property && (
        <>
          <InputSelect
            options={operatorsForType(property.type).map((operator) => ({
              type: "item" as const,
              label: t(operatorLabels[operator]),
              value: operator,
            }))}
            value={filter.operator}
            onChange={handleOperator}
            label={t("Operator")}
            labelHidden
            short
          />
          {renderValueInput()}
          <Button type="button" onClick={() => onChange(undefined)} neutral>
            {t("Clear")}
          </Button>
        </>
      )}
    </Bar>
  );
}

function defaultValue(
  property: Property,
  operator: FilterOperator
): PropertyValue | undefined {
  if (valuelessOperators.has(operator)) {
    return undefined;
  }
  if (property.type === PropertyType.Checkbox) {
    return true;
  }
  if (
    property.type === PropertyType.Select ||
    property.type === PropertyType.MultiSelect
  ) {
    return property.options?.[0]?.id;
  }
  return undefined;
}

const Bar = styled(Flex)`
  flex-wrap: wrap;
`;

const ValueInput = styled.input`
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 4px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  padding: 6px 8px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: ${(props) => props.theme.inputBorderFocused};
  }
`;

export default observer(DatabaseTableFilter);
