import { SearchIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Input, { Props as InputProps } from "~/components/Input";

type Props = InputProps & {
  placeholder?: string;
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => unknown;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => unknown;
};

function InputSearch(
  props: Props,
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) {
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
      ref={ref}
      {...rest}
    />
  );
}

export default React.forwardRef(InputSearch);
