import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { Property, PropertyValue } from "@shared/types";
import { PropertyType } from "@shared/types";
import { sanitizeUrl } from "@shared/utils/urls";
import { InputSelect } from "~/components/InputSelect";
import Switch from "~/components/Switch";
import useStores from "~/hooks/useStores";

const EMPTY_VALUE = "";

type Props = {
  /** The property definition from the collection's data schema. */
  property: Property;
  /** The current value of the property on the document. */
  value: PropertyValue | undefined;
  /** Callback with the new value; null unsets the property. */
  onChange: (value: PropertyValue | null) => void;
  /** Whether the value cannot be edited. */
  readOnly?: boolean;
};

/**
 * Renders a typed editor for a single document property value, switching on
 * the property type from the collection's data schema.
 */
function PropertyValueEditor({ property, value, onChange, readOnly }: Props) {
  const { t } = useTranslation();
  const { users } = useStores();

  const handleSelectChange = React.useCallback(
    (next: string) => onChange(next === EMPTY_VALUE ? null : next),
    [onChange]
  );

  const handleTextCommit = React.useCallback(
    (ev: React.FocusEvent<HTMLInputElement>) => {
      const next = ev.target.value.trim();
      const current = typeof value === "string" ? value : undefined;
      if (next === (current ?? "")) {
        return;
      }
      onChange(next === "" ? null : next);
    },
    [onChange, value]
  );

  const handleNumberCommit = React.useCallback(
    (ev: React.FocusEvent<HTMLInputElement>) => {
      const raw = ev.target.value.trim();
      if (raw === "") {
        if (value !== undefined) {
          onChange(null);
        }
        return;
      }
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed !== value) {
        onChange(parsed);
      }
    },
    [onChange, value]
  );

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.currentTarget.blur();
      }
    },
    []
  );

  const handleToggleOption = React.useCallback(
    (optionId: string) => {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      onChange(next.length === 0 ? null : next);
    },
    [onChange, value]
  );

  switch (property.type) {
    case PropertyType.Text:
      return (
        <NudeInput
          type="text"
          defaultValue={typeof value === "string" ? value : ""}
          placeholder={readOnly ? "–" : t("Empty")}
          onBlur={handleTextCommit}
          onKeyDown={handleKeyDown}
          disabled={readOnly}
        />
      );

    case PropertyType.Number:
      return (
        <NudeInput
          type="number"
          defaultValue={typeof value === "number" ? String(value) : ""}
          placeholder={readOnly ? "–" : t("Empty")}
          onBlur={handleNumberCommit}
          onKeyDown={handleKeyDown}
          disabled={readOnly}
        />
      );

    case PropertyType.Checkbox:
      return (
        <Switch
          checked={value === true}
          onChange={(checked) => onChange(checked)}
          disabled={readOnly}
          inForm={false}
        />
      );

    case PropertyType.Date: {
      const date = typeof value === "string" ? value.slice(0, 10) : "";
      return (
        <NudeInput
          type="date"
          defaultValue={date}
          onBlur={handleTextCommit}
          disabled={readOnly}
        />
      );
    }

    case PropertyType.Url: {
      const url = typeof value === "string" ? value : "";
      if (readOnly) {
        return url ? (
          <UrlLink
            href={sanitizeUrl(url)}
            target="_blank"
            rel="noreferrer nofollow"
          >
            {url}
          </UrlLink>
        ) : (
          <Placeholder>–</Placeholder>
        );
      }
      return (
        <NudeInput
          type="url"
          defaultValue={url}
          placeholder={t("Empty")}
          onBlur={handleTextCommit}
          onKeyDown={handleKeyDown}
        />
      );
    }

    case PropertyType.Select: {
      const options = property.options ?? [];
      if (readOnly) {
        const selected = options.find((option) => option.id === value);
        return selected ? (
          <Chip $color={selected.color}>{selected.name}</Chip>
        ) : (
          <Placeholder>–</Placeholder>
        );
      }
      return (
        <InputSelect
          options={[
            { type: "item", label: t("None"), value: EMPTY_VALUE },
            ...options.map((option) => ({
              type: "item" as const,
              label: option.name,
              value: option.id,
            })),
          ]}
          value={typeof value === "string" ? value : EMPTY_VALUE}
          onChange={handleSelectChange}
          label={property.name}
          labelHidden
          short
        />
      );
    }

    case PropertyType.MultiSelect: {
      const options = property.options ?? [];
      const selectedIds = Array.isArray(value) ? value : [];
      return (
        <ChipList>
          {options.map((option) => {
            const selected = selectedIds.includes(option.id);
            if (readOnly && !selected) {
              return null;
            }
            return (
              <ChipButton
                key={option.id}
                type="button"
                $selected={selected}
                $color={option.color}
                onClick={
                  readOnly ? undefined : () => handleToggleOption(option.id)
                }
                disabled={readOnly}
              >
                {option.name}
              </ChipButton>
            );
          })}
          {readOnly && selectedIds.length === 0 && <Placeholder>–</Placeholder>}
        </ChipList>
      );
    }

    case PropertyType.Person: {
      if (readOnly) {
        const user = typeof value === "string" ? users.get(value) : undefined;
        return user ? <span>{user.name}</span> : <Placeholder>–</Placeholder>;
      }
      return (
        <InputSelect
          options={[
            { type: "item", label: t("None"), value: EMPTY_VALUE },
            ...users.activeOrInvited.map((user) => ({
              type: "item" as const,
              label: user.name,
              value: user.id,
            })),
          ]}
          value={typeof value === "string" ? value : EMPTY_VALUE}
          onChange={handleSelectChange}
          label={property.name}
          labelHidden
          short
        />
      );
    }

    default:
      return null;
  }
}

const NudeInput = styled.input`
  border: 0;
  outline: none;
  background: none;
  color: ${s("text")};
  font-size: 14px;
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background: ${s("backgroundSecondary")};
  }

  &::placeholder {
    color: ${s("placeholder")};
  }

  &:disabled {
    color: ${s("textSecondary")};
  }
`;

const Placeholder = styled.span`
  color: ${s("placeholder")};
  padding: 4px 6px;
`;

const UrlLink = styled.a`
  color: ${s("accent")};
  padding: 4px 6px;
  overflow-wrap: anywhere;
`;

const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 6px;
`;

const Chip = styled.span<{ $color?: string }>`
  background: ${(props) => props.$color ?? props.theme.backgroundSecondary};
  color: ${s("text")};
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 13px;
`;

const ChipButton = styled.button<{ $selected: boolean; $color?: string }>`
  border: 1px solid
    ${(props) => (props.$selected ? "transparent" : props.theme.inputBorder)};
  background: ${(props) =>
    props.$selected
      ? (props.$color ?? props.theme.backgroundSecondary)
      : "none"};
  color: ${(props) => (props.$selected ? s("text") : s("textSecondary"))};
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 13px;
  cursor: var(--pointer);

  &:disabled {
    cursor: default;
  }
`;

export default observer(PropertyValueEditor);
