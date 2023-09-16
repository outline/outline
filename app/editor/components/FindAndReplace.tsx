import {
  CaretDownIcon,
  CaretUpIcon,
  CaseSensitiveIcon,
  RegexIcon,
  ReplaceIcon,
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
import { Portal } from "~/components/Portal";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Tooltip from "~/components/Tooltip";
import useKeyDown from "~/hooks/useKeyDown";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import Desktop from "~/utils/Desktop";
import { altDisplay, isModKey, metaDisplay } from "~/utils/keyboard";
import { useEditor } from "./EditorContext";

type Props = {
  readOnly?: boolean;
};

export default function FindAndReplace({ readOnly }: Props) {
  const editor = useEditor();
  const finalFocusRef = React.useRef<HTMLElement>(
    editor.view.dom.parentElement
  );
  const selectionRef = React.useRef<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputReplaceRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const [showReplace, setShowReplace] = React.useState(false);
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [regexEnabled, setRegex] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [replaceTerm, setReplaceTerm] = React.useState("");
  const popover = usePopoverState();
  const { show } = popover;

  // Hooks for desktop app menu items
  React.useEffect(() => {
    if (!Desktop.bridge) {
      return;
    }
    if ("onFindInPage" in Desktop.bridge) {
      Desktop.bridge.onFindInPage(() => {
        selectionRef.current = window.getSelection()?.toString();
        show();
      });
    }
    if ("onReplaceInPage" in Desktop.bridge) {
      Desktop.bridge.onReplaceInPage(() => {
        setShowReplace(true);
        show();
      });
    }
  }, [show]);

  useOnClickOutside(popover.unstable_referenceRef, popover.hide);

  // Keyboard shortcuts
  useKeyDown(
    (ev) =>
      isModKey(ev) &&
      !popover.visible &&
      ev.code === "KeyF" &&
      // Keyboard handler is through the AppMenu on Desktop v1.2.0+
      !(Desktop.bridge && "onFindInPage" in Desktop.bridge),
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

  // Callbacks
  const handleMore = React.useCallback(() => {
    setShowReplace((state) => !state);
    setTimeout(() => inputReplaceRef.current?.focus(), 100);
  }, []);

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
      if (readOnly) {
        return;
      }
      ev.preventDefault();
      editor.commands.replace({ text: replaceTerm });
    },
    [editor.commands, readOnly, replaceTerm]
  );

  const handleReplaceAll = React.useCallback(
    (ev) => {
      if (readOnly) {
        return;
      }
      ev.preventDefault();
      editor.commands.replaceAll({ text: replaceTerm });
    },
    [editor.commands, readOnly, replaceTerm]
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
      position: "absolute",
      left: "initial",
      top: 60,
      right: 16,
      zIndex: depths.popover,
    }),
    []
  );

  React.useEffect(() => {
    if (popover.visible) {
      const startSearchText = selectionRef.current || searchTerm;

      editor.commands.find({
        text: startSearchText,
        caseSensitive,
        regexEnabled,
      });

      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(0, startSearchText.length);
      });

      if (selectionRef.current) {
        setSearchTerm(selectionRef.current);
      }
    } else {
      setShowReplace(false);
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
    <Portal>
      <Popover
        {...popover}
        unstable_finalFocusRef={finalFocusRef}
        style={style}
        aria-label={t("Find and replace")}
        width={420}
      >
        <Content column>
          <Flex gap={8}>
            <StyledInput
              ref={inputRef}
              maxLength={255}
              value={searchTerm}
              placeholder={`${t("Find")}…`}
              onChange={handleChangeFind}
              onKeyDown={handleKeyDown}
            >
              <SearchModifiers gap={8}>
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
              </SearchModifiers>
            </StyledInput>
            {navigation}
            {!readOnly && (
              <Tooltip
                tooltip={t("Replace options")}
                delay={500}
                placement="bottom"
              >
                <ButtonLarge onClick={handleMore}>
                  <ReplaceIcon color={theme.textSecondary} />
                </ButtonLarge>
              </Tooltip>
            )}
          </Flex>
          <ResizingHeightContainer>
            {showReplace && !readOnly && (
              <Flex gap={8}>
                <StyledInput
                  maxLength={255}
                  value={replaceTerm}
                  ref={inputReplaceRef}
                  placeholder={t("Replacement")}
                  onKeyDown={handleReplaceKeyDown}
                  onRequestSubmit={handleReplaceAll}
                  onChange={(ev) => setReplaceTerm(ev.currentTarget.value)}
                />
                <Button onClick={handleReplace} neutral>
                  {t("Replace")}
                </Button>
                <Button onClick={handleReplaceAll} neutral>
                  {t("Replace all")}
                </Button>
              </Flex>
            )}
          </ResizingHeightContainer>
        </Content>
      </Popover>
    </Portal>
  );
}

const SearchModifiers = styled(Flex)`
  margin-right: 4px;
`;

const StyledInput = styled(Input)`
  flex: 1;
`;

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
