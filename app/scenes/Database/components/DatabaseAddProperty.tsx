import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { s } from "@shared/styles";
import type { Property } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { PropertyType } from "@shared/types";
import { PropertyValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";

type Props = {
  /** The names already used by the schema, to reject duplicates. */
  existingNames: string[];
  /** Callback with the new property to append to the schema. */
  onAdd: (property: Property) => Promise<void>;
};

/**
 * Property types that can be created directly from a view. Relations and
 * rollups need extra configuration and remain in the schema editor.
 */
const simpleTypes: { type: PropertyType; label: string }[] = [
  { type: PropertyType.Text, label: "Text" },
  { type: PropertyType.Number, label: "Number" },
  { type: PropertyType.Select, label: "Select" },
  { type: PropertyType.MultiSelect, label: "Multi-select" },
  { type: PropertyType.Checkbox, label: "Checkbox" },
  { type: PropertyType.Date, label: "Date" },
  { type: PropertyType.Url, label: "URL" },
  { type: PropertyType.Person, label: "Person" },
];

/**
 * A "+" button opening a small popover to add a new property to the database
 * schema without opening the full schema editor.
 */
function DatabaseAddProperty({ existingNames, onAdd }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<PropertyType>(PropertyType.Text);
  const [isSaving, setIsSaving] = React.useState(false);

  const trimmed = name.trim();
  const isDuplicate = existingNames.some(
    (existing) => existing.trim().toLowerCase() === trimmed.toLowerCase()
  );
  const isValid = trimmed !== "" && !isDuplicate;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setName("");
      setType(PropertyType.Text);
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!isValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onAdd({
        id: uuidv4(),
        name: trimmed,
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
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
        width={260}
        shrink
      >
        <form onSubmit={handleSubmit}>
          <Flex column gap={8}>
            <Input
              value={name}
              placeholder={t("Property name")}
              maxLength={PropertyValidation.maxNameLength}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                setName(ev.target.value)
              }
              margin={0}
              autoFocus
            />
            <InputSelect
              options={simpleTypes.map((item) => ({
                type: "item" as const,
                label: t(item.label),
                value: item.type,
              }))}
              value={type}
              onChange={(value) => {
                const next = simpleTypes.find((item) => item.type === value);
                if (next) {
                  setType(next.type);
                }
              }}
              label={t("Type")}
              labelHidden
              short
            />
            <Flex justify="flex-end">
              <Button type="submit" disabled={!isValid || isSaving}>
                {isSaving ? `${t("Saving")}…` : t("Add")}
              </Button>
            </Flex>
          </Flex>
        </form>
      </PopoverContent>
    </Popover>
  );
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

export default observer(DatabaseAddProperty);
