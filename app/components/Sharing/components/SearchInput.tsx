import { AnimatePresence } from "framer-motion";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import Flex from "~/components/Flex";
import useMobile from "~/hooks/useMobile";
import Input, { NativeInput } from "../../Input";
import { HeaderInput } from "../components";

type Props = {
  query: string;
  onChange: React.ChangeEventHandler;
  onClick: React.MouseEventHandler;
  onKeyDown: React.KeyboardEventHandler;
  back: React.ReactNode;
  action: React.ReactNode;
};

export const SearchInput = React.forwardRef(function _SearchInput(
  { onChange, onClick, onKeyDown, query, back, action }: Props,
  ref: React.Ref<HTMLInputElement>
) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isMobile = useMobile();

  const focusInput = React.useCallback(
    (event) => {
      if (event.target.closest("button")) {
        return;
      }
      inputRef.current?.focus();
      onClick(event);
    },
    [onClick]
  );

  return isMobile ? (
    <Flex align="center" style={{ marginBottom: 12 }} auto>
      {back}
      <Input
        key="input"
        placeholder={`${t("Add or invite")}…`}
        value={query}
        onChange={onChange}
        onClick={onClick}
        onKeyDown={onKeyDown}
        autoFocus
        margin={0}
        flex
      >
        {action}
      </Input>
    </Flex>
  ) : (
    <HeaderInput align="center" onClick={focusInput}>
      <AnimatePresence initial={false}>
        {back}
        <NativeInput
          key="input"
          ref={mergeRefs([inputRef, ref])}
          placeholder={`${t("Add or invite")}…`}
          value={query}
          onChange={onChange}
          onClick={onClick}
          onKeyDown={onKeyDown}
          style={{ padding: "6px 0" }}
        />
        {action}
      </AnimatePresence>
    </HeaderInput>
  );
});
