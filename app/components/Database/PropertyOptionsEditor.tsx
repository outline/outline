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
 * each with a color swatch, a name input and a remove button. "Add option"
 * appends a row immediately, but the new option is only propagated once it
 * has a name, so an empty name is never persisted. Renames are committed on
 * blur; color and remove commit immediately.
 */
function PropertyOptionsEditor({ options, onChange }: Props) {
  const { t } = useTranslation();
  // names are typed locally and committed on blur so every keystroke does
  // not propagate a change upstream
  const [names, setNames] = React.useState<Record<string, string>>({});
  // freshly added rows are kept local until they are given a name
  const [pending, setPending] = React.useState<PropertyOption[]>([]);
  const pendingIds = new Set(pending.map((option) => option.id));

  /**
   * Applies pending name edits on top of the given options and propagates
   * the result. An edit blanked out reverts to the previous name so an
   * empty name is never committed.
   */
  const commit = (next: PropertyOption[]) => {
    // keep in-progress text of rows that are still pending
    setNames((current) => {
      const kept: Record<string, string> = {};
      for (const id of Object.keys(current)) {
        if (pendingIds.has(id)) {
          kept[id] = current[id];
        }
      }
      return kept;
    });
    onChange(
      next.map((option) => {
        const name = (names[option.id] ?? option.name).trim();
        return { ...option, name: name || option.name };
      })
    );
  };

  const handleAdd = () => {
    setPending((current) => [...current, { id: uuidv4(), name: "" }]);
  };

  /** Moves a pending row into the committed options once it has a name. */
  const handlePendingNameCommit = (option: PropertyOption) => {
    const name = (names[option.id] ?? "").trim();
    if (!name) {
      return;
    }
    setPending((current) => current.filter((item) => item.id !== option.id));
    commit([...options, { ...option, name }]);
  };

  const handleRemove = (option: PropertyOption) => {
    if (pendingIds.has(option.id)) {
      setPending((current) => current.filter((item) => item.id !== option.id));
      return;
    }
    commit(options.filter((item) => item.id !== option.id));
  };

  const handleColor = (option: PropertyOption, color: string) => {
    if (pendingIds.has(option.id)) {
      setPending((current) =>
        current.map((item) =>
          item.id === option.id ? { ...item, color } : item
        )
      );
      return;
    }
    commit(
      options.map((item) => (item.id === option.id ? { ...item, color } : item))
    );
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.nativeEvent.isComposing) {
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.currentTarget.blur();
    }
  };

  return (
    <Flex column gap={4}>
      {[...options, ...pending].map((option) => {
        const isPending = pendingIds.has(option.id);
        return (
          <Flex key={option.id} align="center" gap={8}>
            <SwatchButton
              color={option.color}
              size={20}
              onChange={(color) => handleColor(option, color)}
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
              onKeyDown={handleKeyDown}
              onBlur={() =>
                isPending ? handlePendingNameCommit(option) : commit(options)
              }
              margin={0}
              autoFocus={isPending}
            />
            <NudeButton
              type="button"
              onClick={() => handleRemove(option)}
              aria-label={t("Remove")}
            >
              <CloseIcon size={16} />
            </NudeButton>
          </Flex>
        );
      })}
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
