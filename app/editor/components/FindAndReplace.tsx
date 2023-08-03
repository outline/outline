import {
  CaretDownIcon,
  CaretUpIcon,
  CaseSensitiveIcon,
  MoreIcon,
  RegexIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import { depths, s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import Popover from "~/components/Popover";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Tooltip from "~/components/Tooltip";
import useKeyDown from "~/hooks/useKeyDown";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import { altDisplay, isModKey, metaDisplay } from "~/utils/keyboard";
import { useEditor } from "./EditorContext";

type Props = {
  readOnly?: boolean;
};

export default function FindAndReplace({ readOnly }: Props) {
  const editor = useEditor();
  const selectionRef = React.useRef<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const [showReplace, setShowReplace] = React.useState(false);
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [regexEnabled, setRegex] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [replaceTerm, setReplaceTerm] = React.useState("");

  const popover = usePopoverState();

  useKeyDown("Escape", popover.hide);
  useOnClickOutside(popover.unstable_referenceRef, popover.hide);

  useKeyDown(
    (ev) => isModKey(ev) && !popover.visible && ev.code === "KeyF",
    (ev) => {
      ev.preventDefault();
      selectionRef.current = window.getSelection()?.toString();
      popover.show();
    }
  );

  useKeyDown(
    (ev) => isModKey(ev) && ev.altKey && ev.code === "KeyR" && popover.visible,
    (ev) => {
      ev.preventDefault();
      setRegex((state) => !state);
    },
    { allowInInput: true }
  );

  useKeyDown(
    (ev) => isModKey(ev) && ev.altKey && ev.code === "KeyC" && popover.visible,
    (ev) => {
      ev.preventDefault();
      setCaseSensitive((state) => !state);
    },
    { allowInInput: true }
  );

  const handleMore = React.useCallback(
    () => setShowReplace((state) => !state),
    []
  );

  const handleCaseSensitive = React.useCallback(() => {
    setCaseSensitive((state) => {
      const caseSensitive = !state;

      editor.commands.find({
        text: searchTerm,
        caseSensitive,
        regexEnabled,
      });

      return caseSensitive;
    });
  }, [regexEnabled, editor.commands, searchTerm]);

  const handleRegex = React.useCallback(() => {
    setRegex((state) => {
      const regexEnabled = !state;

      editor.commands.find({
        text: searchTerm,
        caseSensitive,
        regexEnabled,
      });

      return regexEnabled;
    });
  }, [caseSensitive, editor.commands, searchTerm]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.preventDefault();

        if (ev.shiftKey) {
          editor.commands.prevSearchMatch();
        } else {
          editor.commands.nextSearchMatch();
        }
      }
    },
    [editor.commands]
  );

  const handleReplace = React.useCallback(
    (ev) => {
      ev.preventDefault();
      editor.commands.replace({ text: replaceTerm });
    },
    [editor.commands, replaceTerm]
  );

  const handleReplaceAll = React.useCallback(
    (ev) => {
      ev.preventDefault();
      editor.commands.replaceAll({ text: replaceTerm });
    },
    [editor.commands, replaceTerm]
  );

  const handleChangeFind = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setSearchTerm(ev.currentTarget.value);

      editor.commands.find({
        text: ev.currentTarget.value,
        caseSensitive,
        regexEnabled,
      });
    },
    [caseSensitive, editor.commands, regexEnabled]
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
        editor.commands.find({
          text: selectionRef.current,
          caseSensitive,
          regexEnabled,
        });
      }
      inputRef.current?.setSelectionRange(0, searchTerm.length);
    } else {
      editor.commands.clearSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popover.visible]);

  const navigation = (
    <>
      <Tooltip
        tooltip={t("Previous match")}
        shortcut="shift+enter"
        delay={500}
        placement="bottom"
      >
        <ButtonLarge onClick={() => editor.commands.prevSearchMatch()}>
          <CaretUpIcon />
        </ButtonLarge>
      </Tooltip>
      <Tooltip
        tooltip={t("Next match")}
        shortcut="enter"
        delay={500}
        placement="bottom"
      >
        <ButtonLarge onClick={() => editor.commands.nextSearchMatch()}>
          <CaretDownIcon />
        </ButtonLarge>
      </Tooltip>
    </>
  );

  return (
    <Popover
      {...popover}
      style={style}
      aria-label={t("Find and replace")}
      width={420}
    >
      <Content column>
        <Flex gap={8}>
          <Input
            ref={inputRef}
            maxLength={255}
            value={searchTerm}
            placeholder={`${t("Find")}…`}
            onChange={handleChangeFind}
            onKeyDown={handleKeyDown}
          >
            <Flex gap={8}>
              <Tooltip
                tooltip={t("Match case")}
                shortcut={`${altDisplay}+${metaDisplay}+c`}
                delay={500}
                placement="bottom"
              >
                <ButtonSmall onClick={handleCaseSensitive}>
                  <CaseSensitiveIcon
                    color={caseSensitive ? theme.accent : theme.textSecondary}
                  />
                </ButtonSmall>
              </Tooltip>
              <Tooltip
                tooltip={t("Enable regex")}
                shortcut={`${altDisplay}+${metaDisplay}+r`}
                delay={500}
                placement="bottom"
              >
                <ButtonSmall onClick={handleRegex}>
                  <RegexIcon
                    color={regexEnabled ? theme.accent : theme.textSecondary}
                  />
                </ButtonSmall>
              </Tooltip>
            </Flex>
          </Input>
          {navigation}
          {!readOnly && (
            <Tooltip tooltip={t("More options")} delay={500} placement="bottom">
              <ButtonLarge onClick={handleMore}>
                <MoreIcon color={theme.textSecondary} />
              </ButtonLarge>
            </Tooltip>
          )}
        </Flex>
        <ResizingHeightContainer>
          {showReplace && (
            <Flex gap={8}>
              <Input
                maxLength={255}
                value={replaceTerm}
                placeholder={t("Replacement")}
                onKeyDown={handleReplaceKeyDown}
                onRequestSubmit={handleReplaceAll}
                onChange={(ev) => setReplaceTerm(ev.currentTarget.value)}
              />
              <Flex gap={8}>
                <Button onClick={handleReplace} neutral>
                  {t("Replace")}
                </Button>
                <Button onClick={handleReplaceAll} neutral>
                  {t("Replace all")}
                </Button>
              </Flex>
            </Flex>
          )}
        </ResizingHeightContainer>
      </Content>
    </Popover>
  );
}

const ButtonSmall = styled(NudeButton)`
  &:hover,
  &[aria-expanded="true"] {
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const ButtonLarge = styled(ButtonSmall)`
  width: 32px;
  height: 32px;
`;

const Content = styled(Flex)`
  padding: 8px 0;
  margin-bottom: -16px;
`;
