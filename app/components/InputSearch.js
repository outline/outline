// @flow
import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import Input from "./Input";
import useStores from "hooks/useStores";
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
  let input: ?Input;
  const { history } = useStores();
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
      input.focus();
    }
  });

  const handleSearchInput = (ev: SyntheticInputEvent<>) => {
    ev.preventDefault();
    history.push(
      searchUrl(ev.target.value, {
        collectionId: collectionId,
        ref: source,
      })
    );
  };

  const handleFocus = React.useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = React.useCallback(() => {
    setFocused(false);
  }, []);

  return (
    <InputMaxWidth
      ref={(ref) => (input = ref)}
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
