// @flow
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Input from "./Input";

type Props = {|
  placeholder?: string,
  value?: string,
  onChange: (event: SyntheticInputEvent<>) => mixed,
  onKeyDown: (event: SyntheticKeyboardEvent<HTMLInputElement>) => mixed,
|};

export default function InputSearch(props: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = React.useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = React.useCallback(() => {
    setIsFocused(false);
  }, []);

  const { placeholder = `${t("Search")}…`, onKeyDown, ...rest } = props;

  return (
    <Input
      type="search"
      placeholder={placeholder}
      icon={
        <SearchIcon
          color={isFocused ? theme.inputBorderFocused : theme.inputBorder}
        />
      }
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      margin={0}
      labelHidden
      {...rest}
    />
  );
}
