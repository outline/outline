import { AnimatePresence } from "framer-motion";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Flex from "~/components/Flex";
import useMobile from "~/hooks/useMobile";
import Input, { NativeInput } from "../../Input";
import { HeaderInput } from "../components";

type Props = {
  query: string;
  onChange: React.ChangeEventHandler;
  onClick: React.MouseEventHandler;
  back: React.ReactNode;
  action: React.ReactNode;
};

export function SearchInput({ onChange, onClick, query, back, action }: Props) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isMobile = useMobile();

  const focusInput = React.useCallback(
    (event) => {
      // if (!picker) {
      inputRef.current?.focus();
      onClick(event);
      // }
    },
    [onClick]
  );

  return isMobile ? (
    <Flex align="center" style={{ marginBottom: 12 }} auto>
      {back}
      <Input
        key="input"
        placeholder={`${t("Invite")}…`}
        value={query}
        onChange={onChange}
        onClick={onClick}
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
          ref={inputRef}
          placeholder={`${t("Invite")}…`}
          value={query}
          onChange={onChange}
          onClick={onClick}
          style={{ padding: "6px 0" }}
        />
        {action}
      </AnimatePresence>
    </HeaderInput>
  );
}

export const HeaderInput = styled(Flex)`
  position: sticky;
  z-index: 1;
  top: 0;
  background: ${s("menuBackground")};
  color: ${s("textTertiary")};
  border-bottom: 1px solid ${s("inputBorder")};
  padding: 0 24px 12px;
  margin-top: 0;
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: 12px;
  cursor: text;

  &:before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -20px;
    height: 20px;
    background: ${s("menuBackground")};
  }
`;
