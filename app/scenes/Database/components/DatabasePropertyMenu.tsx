import { observer } from "mobx-react";
import {
  CheckmarkIcon,
  EyeIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  TrashIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataViewSort, Property, PropertyOption } from "@shared/types";
import { PropertyType } from "@shared/types";
import { PropertyValidation } from "@shared/validations";
import Text from "~/components/Text";
import PropertyOptionsEditor from "~/components/Database/PropertyOptionsEditor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";

type Props = {
  /** The property the menu configures. */
  property: Property;
  /** The view's active sort, to mark the active direction. */
  sort?: DataViewSort;
  /** Callback when the property is renamed. */
  onRename: (name: string) => void;
  /** Callback when a sort direction is chosen; null clears the sort. */
  onSetSort: (direction: "asc" | "desc" | null) => void;
  /** Callback when the property is hidden from the view. */
  onHide: () => void;
  /** Callback when the property's options change. */
  onChangeOptions: (options: PropertyOption[]) => void;
  /** Callback when the property is deleted from the schema. */
  onDelete: () => void;
  /** The header content acting as the menu trigger. */
  children: React.ReactNode;
};

/**
 * The settings menu of a table column, opened by clicking its header: rename
 * inline, sort the view, hide the property, edit select options and their
 * colors, or delete the property from the schema.
 */
function DatabasePropertyMenu({
  property,
  sort,
  onRename,
  onSetSort,
  onHide,
  onChangeOptions,
  onDelete,
  children,
}: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [name, setName] = React.useState(property.name);

  const supportsOptions =
    property.type === PropertyType.Select ||
    property.type === PropertyType.MultiSelect;
  const isSortable = property.type !== PropertyType.Rollup;
  const activeDirection =
    sort?.propertyId === property.id ? sort.direction : undefined;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setName(property.name);
    }
  };

  const handleRenameCommit = () => {
    const next = name.trim();
    if (next && next !== property.name) {
      onRename(next);
    } else {
      setName(property.name);
    }
  };

  const handleNameKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.nativeEvent.isComposing) {
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      handleRenameCommit();
      setIsOpen(false);
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      setName(property.name);
    }
  };

  const handleSort = (direction: "asc" | "desc") => {
    onSetSort(activeDirection === direction ? null : direction);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <HeaderButton type="button">{children}</HeaderButton>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        aria-label={property.name}
        width={260}
        shrink
      >
        <NameInput
          type="text"
          value={name}
          placeholder={t("Property name")}
          maxLength={PropertyValidation.maxNameLength}
          onChange={(ev) => setName(ev.target.value)}
          onKeyDown={handleNameKeyDown}
          onBlur={handleRenameCommit}
        />
        {isSortable && (
          <>
            <MenuItem type="button" onClick={() => handleSort("asc")}>
              <SortAscendingIcon />
              {t("Sort ascending")}
              {activeDirection === "asc" && <ActiveCheck />}
            </MenuItem>
            <MenuItem type="button" onClick={() => handleSort("desc")}>
              <SortDescendingIcon />
              {t("Sort descending")}
              {activeDirection === "desc" && <ActiveCheck />}
            </MenuItem>
          </>
        )}
        <MenuItem
          type="button"
          onClick={() => {
            onHide();
            setIsOpen(false);
          }}
        >
          <EyeIcon />
          {t("Hide in view")}
        </MenuItem>
        {supportsOptions && (
          <>
            <Separator />
            <SectionLabel type="tertiary" size="xsmall">
              {t("Options")}
            </SectionLabel>
            <PropertyOptionsEditor
              options={property.options ?? []}
              onChange={onChangeOptions}
            />
          </>
        )}
        <Separator />
        <MenuItem
          type="button"
          $danger
          onClick={() => {
            onDelete();
            setIsOpen(false);
          }}
        >
          <TrashIcon />
          {t("Delete property")}
        </MenuItem>
      </PopoverContent>
    </Popover>
  );
}

const ActiveCheck = styled(CheckmarkIcon)`
  margin-left: auto;
`;

const HeaderButton = styled.button`
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: var(--pointer);
  display: inline-flex;
  align-items: center;
  gap: 2px;

  &:hover {
    color: ${s("text")};
  }
`;

const NameInput = styled.input`
  border: 1px solid ${s("inputBorder")};
  outline: none;
  background: none;
  color: ${s("text")};
  font-size: 14px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 8px;

  &:focus {
    border-color: ${s("inputBorderFocused")};
  }

  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: none;
  color: ${(props) => (props.$danger ? props.theme.danger : props.theme.text)};
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: var(--pointer);
  text-align: left;

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const Separator = styled.hr`
  border: 0;
  border-top: 1px solid ${s("divider")};
  margin: 8px 0;
`;

const SectionLabel = styled(Text)`
  display: block;
  margin: 0 0 4px;
`;

export default observer(DatabasePropertyMenu);
