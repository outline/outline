// @flow
import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Input from "./Input";
import useBoolean from "hooks/useBoolean";
import useKeyDown from "hooks/useKeyDown";
import { isModKey } from "utils/keyboard";
import { searchUrl } from "utils/routeHelpers";

type Props = {|
  source: string,
  placeholder?: string,
  label?: string,
  labelHidden?: boolean,
  collectionId?: string,
  value: string,
  onChange: (event: SyntheticInputEvent<>) => mixed,
  onKeyDown: (event: SyntheticKeyboardEvent<HTMLInputElement>) => mixed,
|};

function InputSearchPage({
  onKeyDown,
  value,
  onChange,
  placeholder,
  label,
  collectionId,
  source,
}: Props) {
  const inputRef = React.useRef();
  const theme = useTheme();
  const history = useHistory();
  const { t } = useTranslation();
  const [isFocused, setFocused, setUnfocused] = useBoolean(false);

  const focus = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useKeyDown("f", (ev: KeyboardEvent) => {
    if (isModKey(ev)) {
      ev.preventDefault();
      focus();
    }
  });

  const handleKeyDown = React.useCallback(
    (ev: SyntheticKeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        history.push(
          searchUrl(ev.currentTarget.value, {
            collectionId,
            ref: source,
          })
        );
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
`;

export default observer(InputSearchPage);
