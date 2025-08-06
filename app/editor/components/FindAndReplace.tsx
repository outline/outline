import {
  CaretDownIcon,
  CaretUpIcon,
  CaseSensitiveIcon,
  RegexIcon,
  ReplaceIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { depths, s } from "@shared/styles";
import { altDisplay, isModKey, metaDisplay } from "@shared/utils/keyboard";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useKeyDown from "~/hooks/useKeyDown";
import Desktop from "~/utils/Desktop";
import { useEditor } from "./EditorContext";

type KeyboardShortcutsProps = {
  open: boolean;
  handleOpen: ({ withReplace }: { withReplace: boolean }) => void;
  handleCaseSensitive: () => void;
  handleRegex: () => void;
};

function useKeyboardShortcuts({
  open,
  handleOpen,
  handleCaseSensitive,
  handleRegex,
}: KeyboardShortcutsProps) {
  // Open popover
  useKeyDown(
    (ev) =>
      isModKey(ev) &&
      !open &&
      ev.code === "KeyF" &&
      // Keyboard handler is through the AppMenu on Desktop v1.2.0+
      !(Desktop.bridge && "onFindInPage" in Desktop.bridge),
    (ev) => {
      ev.preventDefault();
      handleOpen({ withReplace: ev.altKey });
    },
    { allowInInput: true }
  );

  // Enable/disable case sensitive search
  useKeyDown(
    (ev) => isModKey(ev) && ev.altKey && ev.code === "KeyC" && open,
    (ev) => {
      ev.preventDefault();
      handleCaseSensitive();
    },
    { allowInInput: true }
  );

  // Enable/disable regex search
  useKeyDown(
    (ev) => isModKey(ev) && ev.altKey && ev.code === "KeyR" && open,
    (ev) => {
      ev.preventDefault();
      handleRegex();
    },
    { allowInInput: true }
  );
}

type Props = {
  /** Whether the find and replace popover is open */
  open: boolean;
  /** Callback when the find and replace popover is opened */
  onOpen: () => void;
  /** Callback when the find and replace popover is closed */
  onClose: () => void;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** The current highlighted index in the search results */
  currentIndex: number;
  /** The total number of search results */
  totalResults: number;
};

export default function FindAndReplace({
  readOnly,
  open,
  onOpen,
  onClose,
  currentIndex,
  totalResults,
}: Props) {
  const editor = useEditor();
  const [localOpen, setLocalOpen] = React.useState(open);
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

  React.useEffect(() => {
    if (open) {
      setLocalOpen(true);
    }
  }, [open]);

  // Hooks for desktop app menu items
  React.useEffect(() => {
    if (!Desktop.bridge) {
      return;
    }
    if ("onFindInPage" in Desktop.bridge) {
      Desktop.bridge.onFindInPage(() => {
        selectionRef.current = window.getSelection()?.toString();
        setLocalOpen(true);
      });
    }
    if ("onReplaceInPage" in Desktop.bridge) {
      Desktop.bridge.onReplaceInPage(() => {
        setShowReplace(true);
        setLocalOpen(true);
      });
    }
  }, []);

  // Callbacks
  const selectInputText = React.useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(0, inputRef.current?.value.length);
  }, []);

  const selectInputReplaceText = React.useCallback(() => {
    setTimeout(() => {
      inputReplaceRef.current?.focus();
      inputReplaceRef.current?.setSelectionRange(
        0,
        inputReplaceRef.current?.value.length
      );
    }, 100);
  }, []);

  const handleOpen = React.useCallback(
    ({ withReplace }: { withReplace: boolean }) => {
      const shouldShowReplace = !readOnly && withReplace;

      // If already open, switch focus to corresponding input text.
      if (localOpen) {
        if (shouldShowReplace) {
          setShowReplace(true);
          selectInputReplaceText();
        } else {
          selectInputText();
        }

        return;
      }

      selectionRef.current = window.getSelection()?.toString();
      setLocalOpen(true);

      if (shouldShowReplace) {
        setShowReplace(true);
      }
    },
    [localOpen, readOnly, selectInputText, selectInputReplaceText]
  );

  const handleMore = React.useCallback(() => {
    setShowReplace((state) => !state);
    setTimeout(() => inputReplaceRef.current?.focus(), 100);
  }, []);

  const handleCaseSensitive = React.useCallback(() => {
    setCaseSensitive((state) => {
      const isCaseSensitive = !state;

      editor.commands.find({
        text: searchTerm,
        caseSensitive: isCaseSensitive,
        regexEnabled,
      });

      return isCaseSensitive;
    });
  }, [regexEnabled, editor.commands, searchTerm]);

  const handleRegex = React.useCallback(() => {
    setRegex((state) => {
      const isRegexEnabled = !state;

      editor.commands.find({
        text: searchTerm,
        caseSensitive,
        regexEnabled: isRegexEnabled,
      });

      return isRegexEnabled;
    });
  }, [caseSensitive, editor.commands, searchTerm]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      function nextPrevious() {
        if (ev.shiftKey) {
          editor.commands.prevSearchMatch();
        } else {
          editor.commands.nextSearchMatch();
        }
      }

      switch (ev.key) {
        case "Enter": {
          ev.preventDefault();
          nextPrevious();
          return;
        }
        case "g": {
          if (ev.metaKey) {
            ev.preventDefault();
            nextPrevious();
            selectInputText();
          }
          return;
        }
        case "F3": {
          ev.preventDefault();
          nextPrevious();
          selectInputText();
          return;
        }
      }
    },
    [editor.commands, selectInputText]
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

  useKeyboardShortcuts({
    open: localOpen,
    handleOpen,
    handleCaseSensitive,
    handleRegex,
  });

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
    if (localOpen) {
      onOpen();
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
      onClose();
      setShowReplace(false);
      editor.commands.clearSearch();
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [localOpen]);

  const disabled = totalResults === 0;
  const navigation = (
    <>
      <Tooltip
        content={t("Previous match")}
        shortcut="Shift+Enter"
        placement="bottom"
      >
        <ButtonLarge
          disabled={disabled}
          onClick={() => editor.commands.prevSearchMatch()}
        >
          <CaretUpIcon />
        </ButtonLarge>
      </Tooltip>
      <Tooltip content={t("Next match")} shortcut="Enter" placement="bottom">
        <ButtonLarge
          disabled={disabled}
          onClick={() => editor.commands.nextSearchMatch()}
        >
          <CaretDownIcon />
        </ButtonLarge>
      </Tooltip>
    </>
  );

  return (
    <Popover open={localOpen} onOpenChange={setLocalOpen}>
      <PopoverTrigger>
        <span style={style} />
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("Find and replace")}
        width={0}
        minWidth={420}
        scrollable={false}
        onPointerDownOutside={() => setLocalOpen(false)}
      >
        <Content column>
          <Flex gap={4}>
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
                  content={t("Match case")}
                  shortcut={`${altDisplay}+${metaDisplay}+c`}
                  placement="bottom"
                >
                  <ButtonSmall onClick={handleCaseSensitive}>
                    <CaseSensitiveIcon
                      color={caseSensitive ? theme.accent : theme.textSecondary}
                    />
                  </ButtonSmall>
                </Tooltip>
                <Tooltip
                  content={t("Enable regex")}
                  shortcut={`${altDisplay}+${metaDisplay}+r`}
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
                content={t("Replace options")}
                shortcut={`${altDisplay}+${metaDisplay}+f`}
                placement="bottom"
              >
                <ButtonLarge onClick={handleMore}>
                  <ReplaceIcon color={theme.textSecondary} />
                </ButtonLarge>
              </Tooltip>
            )}
            <Results>
              {totalResults > 0 ? currentIndex + 1 : 0} / {totalResults}
            </Results>
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
                <Tooltip
                  content={t("Replace")}
                  shortcut="Enter"
                  placement="bottom"
                >
                  <Button onClick={handleReplace} disabled={disabled} neutral>
                    {t("Replace")}
                  </Button>
                </Tooltip>
                <Tooltip
                  content={t("Replace all")}
                  shortcut={`${metaDisplay}+Enter`}
                  placement="bottom"
                >
                  <Button
                    onClick={handleReplaceAll}
                    disabled={disabled}
                    neutral
                  >
                    {t("Replace all")}
                  </Button>
                </Tooltip>
              </Flex>
            )}
          </ResizingHeightContainer>
        </Content>
      </PopoverContent>
    </Popover>
  );
}

const SearchModifiers = styled(Flex)`
  margin-right: 4px;
`;

const StyledInput = styled(Input)`
  width: 196px;
  flex: 1;
`;

const ButtonSmall = styled(NudeButton)`
  &:hover,
  &[aria-expanded="true"] {
    background: ${s("sidebarControlHoverBackground")};
  }

  &:disabled {
    color: ${s("textTertiary")};
    background: none;
    cursor: default;
  }
`;

const ButtonLarge = styled(ButtonSmall)`
  width: 32px;
  height: 32px;
`;

const Content = styled(Flex)`
  padding: 8px 0;
  margin-bottom: -16px;
  position: static;
`;

const Results = styled.span`
  color: ${s("textSecondary")};
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 32px;
  min-width: 32px;
  letter-spacing: -0.5px;
  text-align: right;
  user-select: none;
`;
