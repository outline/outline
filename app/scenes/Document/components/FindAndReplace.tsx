import {
  CaretDownIcon,
  CaretUpIcon,
  CaseSensitiveIcon,
  RegexIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import { depths } from "@shared/styles";
import ButtonSmall from "~/components/ButtonSmall";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Popover from "~/components/Popover";
import Tooltip from "~/components/Tooltip";
import type { Editor } from "~/editor";
import useKeyDown from "~/hooks/useKeyDown";
import { isModKey, metaDisplay } from "~/utils/keyboard";

type Props = {
  editorRef: React.RefObject<Editor>;
  showReplace: boolean;
};

export default function FindAndReplace({ editorRef, showReplace }: Props) {
  const editor = editorRef.current;
  const selectionRef = React.useRef<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [regexEnabled, setRegex] = React.useState(false);
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

  const handleCaseSensitive = React.useCallback(() => {
    setCaseSensitive((state) => {
      const caseSensitive = !state;

      editor?.commands?.find({
        text: searchTerm,
        caseSensitive,
        regexEnabled,
      });

      return caseSensitive;
    });
  }, [regexEnabled, editor?.commands, searchTerm]);

  const handleRegex = React.useCallback(() => {
    setRegex((state) => {
      const regexEnabled = !state;

      editor?.commands?.find({
        text: searchTerm,
        caseSensitive,
        regexEnabled,
      });

      return regexEnabled;
    });
  }, [caseSensitive, editor?.commands, searchTerm]);

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

      editor?.commands?.find({
        text: ev.currentTarget.value,
        caseSensitive,
        regexEnabled,
      });
    },
    [caseSensitive, editor?.commands, regexEnabled]
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
        editor?.commands?.find({
          text: selectionRef.current,
          caseSensitive,
          regexEnabled,
        });
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
        <Flex>
          <Input
            ref={inputRef}
            maxLength={255}
            value={searchTerm}
            placeholder={t("Find")}
            onChange={handleChangeFind}
            onKeyDown={handleKeyDown}
          />
          <Tooltip
            tooltip={t("Match case")}
            shortcut={`⌥+${metaDisplay}+c`}
            delay={500}
            placement="bottom"
          >
            <ButtonSmall
              onClick={handleCaseSensitive}
              icon={
                <CaseSensitiveIcon
                  color={caseSensitive ? theme.accent : theme.textSecondary}
                />
              }
              neutral
              borderOnHover
            />
          </Tooltip>
          <Tooltip
            tooltip={t("Enable regex")}
            shortcut={`⌥+${metaDisplay}+r`}
            delay={500}
            placement="bottom"
          >
            <ButtonSmall
              onClick={handleRegex}
              icon={
                <RegexIcon
                  color={regexEnabled ? theme.accent : theme.textSecondary}
                />
              }
              neutral
              borderOnHover
            />
          </Tooltip>
        </Flex>
        {showReplace && (
          <>
            <Input
              maxLength={255}
              value={replaceTerm}
              placeholder={t("Replace")}
              onKeyDown={handleReplaceKeyDown}
              onRequestSubmit={handleReplaceAll}
              onChange={(ev) => setReplaceTerm(ev.currentTarget.value)}
            />
            <Flex gap={8}>
              <ButtonSmall onClick={handleReplace} neutral>
                {t("Replace")}
              </ButtonSmall>
              <ButtonSmall onClick={handleReplaceAll} neutral>
                {t("Replace all")}
              </ButtonSmall>
            </Flex>
          </>
        )}

        <Tooltip
          tooltip={t("Previous match")}
          shortcut={`shift+enter`}
          delay={500}
          placement="bottom"
        >
          <ButtonSmall
            onClick={() => editor?.commands?.prevSearchMatch()}
            neutral
            borderOnHover
            icon={<CaretUpIcon />}
          />
        </Tooltip>
        <Tooltip
          tooltip={t("Next match")}
          shortcut={`enter`}
          delay={500}
          placement="bottom"
        >
          <ButtonSmall
            onClick={() => editor?.commands?.nextSearchMatch()}
            neutral
            borderOnHover
            icon={<CaretDownIcon />}
          />
        </Tooltip>
      </Content>
    </Popover>
  );
}

const Content = styled.div`
  padding: 8px 0;
`;
