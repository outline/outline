import { observer } from "mobx-react";
import {
  BulletedListIcon,
  CalendarIcon,
  CheckboxIcon,
  EditIcon,
  HashtagIcon,
  LinkIcon,
  PlusIcon,
  TodoListIcon,
  UserIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { s } from "@shared/styles";
import type { Property } from "@shared/types";
import { PropertyType } from "@shared/types";
import { errToString } from "@shared/utils/error";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";

type Props = {
  /** The names already used by the schema, to derive a unique default name. */
  existingNames: string[];
  /** Callback with the new property to append to the schema. */
  onAdd: (property: Property) => Promise<void>;
};

/**
 * Property types that can be created directly from a view. Relations and
 * rollups need extra configuration and remain in the schema editor.
 */
const simpleTypes: {
  type: PropertyType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: PropertyType.Text, label: "Text", icon: <EditIcon /> },
  { type: PropertyType.Number, label: "Number", icon: <HashtagIcon /> },
  { type: PropertyType.Select, label: "Select", icon: <TodoListIcon /> },
  {
    type: PropertyType.MultiSelect,
    label: "Multi-select",
    icon: <BulletedListIcon />,
  },
  {
    type: PropertyType.Checkbox,
    label: "Checkbox",
    icon: <CheckboxIcon checked={false} />,
  },
  { type: PropertyType.Date, label: "Date", icon: <CalendarIcon /> },
  { type: PropertyType.Url, label: "URL", icon: <LinkIcon /> },
  { type: PropertyType.Person, label: "Person", icon: <UserIcon /> },
];

/**
 * A "+" button opening a menu of property types. Clicking a type immediately
 * appends a property of that type, named after the type; it can then be
 * renamed by clicking the new column's header.
 */
function DatabaseAddProperty({ existingNames, onAdd }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSelect = async (type: PropertyType, label: string) => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onAdd({
        id: uuidv4(),
        name: uniqueName(t(label), existingNames),
        type,
        options:
          type === PropertyType.Select || type === PropertyType.MultiSelect
            ? []
            : undefined,
      });
      setIsOpen(false);
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip content={t("Add property")}>
        <PopoverTrigger>
          <AddButton type="button" aria-label={t("Add property")} size={24}>
            <PlusIcon size={18} />
          </AddButton>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        aria-label={t("Add property")}
        width={180}
        shrink
      >
        {simpleTypes.map((item) => (
          <TypeItem
            key={item.type}
            type="button"
            onClick={() => void handleSelect(item.type, item.label)}
            disabled={isSaving}
          >
            {item.icon}
            {t(item.label)}
          </TypeItem>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Derives a name that does not collide with existing property names by
 * appending an increasing counter, e.g. "Text", "Text 2", "Text 3".
 */
function uniqueName(base: string, existingNames: string[]): string {
  const normalized = new Set(
    existingNames.map((name) => name.trim().toLowerCase())
  );
  if (!normalized.has(base.toLowerCase())) {
    return base;
  }
  let counter = 2;
  while (normalized.has(`${base.toLowerCase()} ${counter}`)) {
    counter += 1;
  }
  return `${base} ${counter}`;
}

const AddButton = styled(NudeButton)`
  color: ${s("textSecondary")};
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

const TypeItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: none;
  color: ${s("text")};
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: var(--pointer);
  text-align: left;

  &:hover:not(:disabled) {
    background: ${s("listItemHoverBackground")};
  }

  &:disabled {
    color: ${s("textSecondary")};
    cursor: default;
  }
`;

export default observer(DatabaseAddProperty);
