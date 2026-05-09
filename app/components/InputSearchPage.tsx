import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import {
  isModKey,
  metaDisplay,
  shortcutSeparator,
} from "@shared/utils/keyboard";
import useBoolean from "~/hooks/useBoolean";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import { searchPath } from "~/utils/routeHelpers";
import Input from "./Input";

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
  const isMobile = useMobile();
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
          searchPath({
            query: ev.currentTarget.value,
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
    >
      {!isMobile && (
        <Shortcut $visible={!isFocused && !value && !collectionId}>
          {metaDisplay}
          {shortcutSeparator}K
        </Shortcut>
      )}
    </InputMaxWidth>
  );
}

const InputMaxWidth = styled(Input).attrs({ round: true })`
  max-width: min(calc(30vw + 20px), 100%);
`;

const Shortcut = styled.span<{ $visible: boolean }>`
  flex-shrink: 0;
  font-size: 13px;
  color: ${s("textTertiary")};
  padding-inline: 0 10px;
  pointer-events: none;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 100ms ease-in-out;
`;

export default observer(InputSearchPage);
