import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { PropertyOption } from "@shared/types";
import { v4 as uuidv4 } from "uuid";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import { SwatchButton } from "~/components/SwatchButton";

type Props = {
  /** The options to edit. */
  options: PropertyOption[];
  /** Callback with the full options list after a committed change. */
  onChange: (options: PropertyOption[]) => void;
};

/**
 * Edits the options of a select or multi-select property as a list of rows,
 * each with a color swatch, a name input and a remove button. Name edits are
 * committed on blur; color, add and remove commit immediately.
 */
function PropertyOptionsEditor({ options, onChange }: Props) {
  const { t } = useTranslation();
  // names are typed locally and committed on blur so every keystroke does
  // not propagate a change upstream
  const [names, setNames] = React.useState<Record<string, string>>({});

  const commit = (next: PropertyOption[]) => {
    setNames({});
    onChange(
      next.map((option) => ({
        ...option,
        name: (names[option.id] ?? option.name).trim(),
      }))
    );
  };

  const handleAdd = () => {
    commit([...options, { id: uuidv4(), name: "" }]);
  };

  const handleRemove = (optionId: string) => {
    commit(options.filter((option) => option.id !== optionId));
  };

  const handleColor = (optionId: string, color: string) => {
    commit(
      options.map((option) =>
        option.id === optionId ? { ...option, color } : option
      )
    );
  };

  return (
    <Flex column gap={4}>
      {options.map((option) => (
        <Flex key={option.id} align="center" gap={8}>
          <SwatchButton
            color={option.color}
            size={20}
            onChange={(color) => handleColor(option.id, color)}
          />
          <OptionNameInput
            value={names[option.id] ?? option.name}
            placeholder={t("Option name")}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
              setNames((current) => ({
                ...current,
                [option.id]: ev.target.value,
              }))
            }
            onBlur={() => commit(options)}
            margin={0}
          />
          <NudeButton
            type="button"
            onClick={() => handleRemove(option.id)}
            aria-label={t("Remove")}
          >
            <CloseIcon size={16} />
          </NudeButton>
        </Flex>
      ))}
      <div>
        <Button
          type="button"
          onClick={handleAdd}
          icon={<PlusIcon />}
          neutral
          borderOnHover
        >
          {t("Add option")}
        </Button>
      </div>
    </Flex>
  );
}

const OptionNameInput = styled(Input)`
  flex-grow: 1;
`;

export default observer(PropertyOptionsEditor);
