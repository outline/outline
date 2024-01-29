import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import useBoolean from "~/hooks/useBoolean";
import useKeyDown from "~/hooks/useKeyDown";
import { isModKey } from "~/utils/keyboard";
import { searchPath } from "~/utils/routeHelpers";
import Input, { Outline } from "./Input";

type Props = {
  source: string;
  placeholder?: string;
  label?: string;
  labelHidden?: boolean;
  collectionId?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => unknown;
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
