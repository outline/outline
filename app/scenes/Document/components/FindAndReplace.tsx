import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import ButtonSmall from "~/components/ButtonSmall";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Popover from "~/components/Popover";
import type { Editor } from "~/editor";
import useKeyDown from "~/hooks/useKeyDown";
import { isModKey } from "~/utils/keyboard";

type Props = {
  editorRef: React.RefObject<Editor>;
  showReplace: boolean;
};

export default function FindAndReplace({ editorRef, showReplace }: Props) {
  const editor = editorRef.current;
  const selectionRef = React.useRef<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [replaceTerm, setReplaceTerm] = React.useState("");

  const popover = usePopoverState();

  useKeyDown("Escape", popover.hide);

  useKeyDown("f", (ev: KeyboardEvent) => {
    if (isModKey(ev) && !popover.visible) {
      selectionRef.current = window.getSelection()?.toString();
      ev.preventDefault();
      popover.show();
    }
  });

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.preventDefault();

        if (ev.shiftKey) {
          editor?.commands?.prevSearchMatch();
        } else {
          editor?.commands?.nextSearchMatch();
        }
      }
    },
    [editor?.commands]
  );

  const handleReplace = React.useCallback(
    (ev) => {
      ev.preventDefault();
      editor?.commands?.replace({ text: replaceTerm });
    },
    [editor?.commands, replaceTerm]
  );

  const handleReplaceAll = React.useCallback(
    (ev) => {
      ev.preventDefault();
      editor?.commands?.replaceAll({ text: replaceTerm });
    },
    [editor?.commands, replaceTerm]
  );

  const handleChangeFind = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setSearchTerm(ev.currentTarget.value);
      editor?.commands?.find({ text: ev.currentTarget.value });
    },
    [editor?.commands]
  );

  const handleReplaceKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        handleReplace(ev);
      }
    },
    [handleReplace]
  );

  const style: React.CSSProperties = React.useMemo(
    () => ({
      position: "fixed",
      left: "initial",
      top: 60,
      right: 16,
      zIndex: depths.popover,
    }),
    []
  );

  React.useEffect(() => {
    if (popover.visible) {
      if (selectionRef.current) {
        setSearchTerm(selectionRef.current);
        editor?.commands?.find({ text: searchTerm });
      }
      inputRef.current?.setSelectionRange(0, searchTerm.length);
    } else {
      editor?.commands?.clearSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popover.visible]);

  return (
    <Popover {...popover} style={style} aria-label={t("Find and replace")}>
      <Content>
        <Input
          ref={inputRef}
          value={searchTerm}
          placeholder={t("Find")}
          onChange={handleChangeFind}
          onKeyDown={handleKeyDown}
        />

        {showReplace && (
          <>
            <Input
              placeholder={t("Replace")}
              value={replaceTerm}
              onKeyDown={handleReplaceKeyDown}
              onRequestSubmit={handleReplaceAll}
              onChange={(ev) => setReplaceTerm(ev.currentTarget.value)}
            />
            <Flex gap={8}>
              <ButtonSmall type="button" onClick={handleReplace} neutral>
                {t("Replace")}
              </ButtonSmall>
              <ButtonSmall type="button" onClick={handleReplaceAll} neutral>
                {t("Replace all")}
              </ButtonSmall>
            </Flex>
          </>
        )}

        <ButtonSmall
          onClick={() => editor?.commands?.prevSearchMatch()}
          neutral
        >
          {t("Previous")}
        </ButtonSmall>
        <ButtonSmall
          onClick={() => editor?.commands?.nextSearchMatch()}
          neutral
        >
          {t("Next")}
        </ButtonSmall>
      </Content>
    </Popover>
  );
}

const Content = styled.div`
  padding: 8px 0;
`;
