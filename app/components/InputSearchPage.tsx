import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import { isModKey } from "@shared/utils/keyboard";
import useBoolean from "~/hooks/useBoolean";
import useKeyDown from "~/hooks/useKeyDown";
import { searchPath } from "~/utils/routeHelpers";
import Input, { Outline } from "./Input";

type Props = {
  /** A string representing where the search started, for tracking. */
  source: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Label for the input. */
  label?: string;
  /** Whether the label should be hidden. */
  labelHidden?: boolean;
  /** An optional ID of a collection to search within. */
  collectionId?: string;
  /** The current value of the input. */
  value?: string;
  /** Event handler for when the input value changes. */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => unknown;
  /** Event handler for when a key is pressed. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => unknown;
};

function InputSearchPage({
  onKeyDown,
  value,
  onChange,
  placeholder,
  label,
  collectionId,
  source,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const history = useHistory();
  const { t } = useTranslation();
  const [isFocused, setFocused, setUnfocused] = useBoolean(false);

  useKeyDown("f", (ev: KeyboardEvent) => {
    if (isModKey(ev) && document.activeElement !== inputRef.current) {
      ev.preventDefault();
      inputRef.current?.focus();
    }
  });

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.nativeEvent.isComposing) {
        return;
      }

      if (ev.key === "Enter") {
        ev.preventDefault();
        history.push(
          searchPath(ev.currentTarget.value, {
            collectionId,
            ref: source,
          })
        );
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        inputRef.current?.blur();
      }

      if (onKeyDown) {
        onKeyDown(ev);
      }
    },
    [history, collectionId, source, onKeyDown]
  );

  return (
    <InputMaxWidth
      ref={inputRef}
      type="search"
      placeholder={placeholder || `${t("Search")}…`}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      icon={
        <SearchIcon
          color={isFocused ? theme.inputBorderFocused : theme.inputBorder}
        />
      }
      label={label}
      onFocus={setFocused}
      onBlur={setUnfocused}
      margin={0}
      labelHidden
    />
  );
}

const InputMaxWidth = styled(Input)`
  max-width: 30vw;

  ${Outline} {
    border-radius: 16px;
  }
`;

export default observer(InputSearchPage);
