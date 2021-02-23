// @flow
import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Input from "./Input";
import { meta } from "utils/keyboard";
import { searchUrl } from "utils/routeHelpers";

type Props = {
  source: string,
  placeholder?: string,
  label?: string,
  labelHidden?: boolean,
  collectionId?: string,
};

function InputSearch(props: Props) {
  const input = React.useRef<Input>(null);
  const history = useHistory();
  const { t } = useTranslation();
  const theme = useTheme();

  const {
    source,
    placeholder = `${t("Search")}…`,
    label,
    labelHidden,
    collectionId,
  } = props;
  const [focused, setFocused] = React.useState(false);

  useHotkeys(`${meta}+f`, (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    if (input) {
      input.current.focus();
    }
  });

  const handleSearchInput = React.useCallback(
    (ev: SyntheticInputEvent<>) => {
      ev.preventDefault();
      history.push(
        searchUrl(ev.target.value, {
          collectionId: collectionId,
          ref: source,
        })
      );
    },
    [collectionId, history, source]
  );

  const handleFocus = React.useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = React.useCallback(() => {
    setFocused(false);
  }, []);

  return (
    <InputMaxWidth
      ref={input}
      type="search"
      placeholder={placeholder}
      onInput={handleSearchInput}
      icon={
        <SearchIcon
          color={focused ? theme.inputBorderFocused : theme.inputBorder}
        />
      }
      label={label}
      labelHidden={labelHidden}
      onFocus={handleFocus}
      onBlur={handleBlur}
      margin={0}
    />
  );
}

const InputMaxWidth = styled(Input)`
  max-width: 30vw;
`;

export default observer(InputSearch);
