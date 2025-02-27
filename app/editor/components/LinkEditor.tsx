import { ArrowIcon, CloseIcon, DocumentIcon, OpenIcon } from "outline-icons";
import { Mark } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { hideScrollbars, s } from "@shared/styles";
import { isInternalUrl, sanitizeUrl } from "@shared/utils/urls";
import Flex from "~/components/Flex";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scrollable from "~/components/Scrollable";
import { Dictionary } from "~/hooks/useDictionary";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";
import Input from "./Input";
import SuggestionsMenuItem from "./SuggestionsMenuItem";
import ToolbarButton from "./ToolbarButton";
import Tooltip from "./Tooltip";

type Props = {
  mark?: Mark;
  from: number;
  to: number;
  dictionary: Dictionary;
  onRemoveLink?: () => void;
  onSelectLink: (options: {
    href: string;
    title?: string;
    from: number;
    to: number;
  }) => void;
  onClickLink: (
    href: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  view: EditorView;
};

const LinkEditor: React.FC<Props> = ({
  mark,
  from,
  to,
  dictionary,
  onRemoveLink,
  onSelectLink,
  onClickLink,
  view,
}) => {
  const getHref = () => sanitizeUrl(mark?.attrs.href) ?? "";
  const initialValue = getHref();
  const initialSelectionLength = to - from;
  const inputRef = useRef<HTMLInputElement>(null);
  const discardRef = useRef(false);
  const [value, setValue] = useState(initialValue);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { documents } = useStores();

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && event.metaKey) {
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);

      // If we discarded the changes then nothing to do
      if (discardRef.current) {
        return;
      }

      // If the link is the same as it was when the editor opened, nothing to do
      if (value === initialValue) {
        return;
      }

      // If the link is totally empty or only spaces then remove the mark
      const href = (value || "").trim();
      if (!href) {
        return handleRemoveLink();
      }

      save(href, href);
    };
  }, [value, initialValue]);

  const save = (href: string, title?: string) => {
    href = href.trim();

    if (href.length === 0) {
      return;
    }

    discardRef.current = true;
    href = sanitizeUrl(href) ?? "";

    onSelectLink({ href, title, from, to });
  };

  const moveSelectionToEnd = () => {
    const { state, dispatch } = view;
    const nextSelection = Selection.findFrom(state.tr.doc.resolve(to), 1, true);
    if (nextSelection) {
      dispatch(state.tr.setSelection(nextSelection));
    }
    view.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const results = documents.findByQuery(value, { maxResults: 5 });

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const maxIndex = results.length - 1;
        setSelectedIndex((current) => (current >= maxIndex ? 0 : current + 1));
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        const maxIndex = results.length - 1;
        setSelectedIndex((current) => (current <= 0 ? maxIndex : current - 1));
        return;
      }
      case "Enter": {
        event.preventDefault();

        if (selectedIndex >= 0 && results[selectedIndex]) {
          const selectedDoc = results[selectedIndex];
          const href = selectedDoc.url;
          save(href, selectedDoc.title);
        } else {
          save(value, value);
        }

        if (initialSelectionLength) {
          moveSelectionToEnd();
        }
        return;
      }
      case "Escape": {
        event.preventDefault();

        if (initialValue) {
          setValue(initialValue);
          moveSelectionToEnd();
        } else {
          handleRemoveLink();
        }
        return;
      }
    }
  };

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    setSelectedIndex(-1);

    const trimmedValue = newValue.trim();
    if (trimmedValue) {
      try {
        //
      } catch (err) {
        Logger.error("Error searching for link", err);
      }
    }
  };

  const handlePaste = () => {
    setTimeout(() => save(value, value), 0);
  };

  const handleOpenLink = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    try {
      onClickLink(getHref(), event);
    } catch (err) {
      toast.error(dictionary.openLinkError);
    }
  };

  const handleRemoveLink = () => {
    discardRef.current = true;

    const { state, dispatch } = view;
    if (mark) {
      dispatch(state.tr.removeMark(from, to, mark));
    }

    onRemoveLink?.();
    view.focus();
  };

  const isInternal = isInternalUrl(value);

  const results = documents.findByQuery(value, { maxResults: 5 });
  const hasResults = !!results.length;

  return (
    <>
      <Wrapper>
        <Input
          ref={inputRef}
          value={value}
          placeholder={dictionary.enterLink}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onChange={handleSearch}
          onFocus={handleSearch}
          autoFocus={getHref() === ""}
          readOnly={!view.editable}
        />

        <Tooltip
          content={isInternal ? dictionary.goToLink : dictionary.openLink}
        >
          <ToolbarButton onClick={handleOpenLink} disabled={!value}>
            {isInternal ? <ArrowIcon /> : <OpenIcon />}
          </ToolbarButton>
        </Tooltip>
        {view.editable && (
          <Tooltip content={dictionary.removeLink}>
            <ToolbarButton onClick={handleRemoveLink}>
              <CloseIcon />
            </ToolbarButton>
          </Tooltip>
        )}
      </Wrapper>
      <SearchResults $hasResults={hasResults}>
        <ResizingHeightContainer>
          {hasResults && (
            <>
              {results.map((doc, index) => (
                <SuggestionsMenuItem
                  onClick={() => {
                    save(doc.url, doc.title);
                    if (initialSelectionLength) {
                      moveSelectionToEnd();
                    }
                  }}
                  selected={index === selectedIndex}
                  key={doc.id}
                  subtitle={doc.collection?.name}
                  title={doc.title}
                  icon={
                    doc.icon ? (
                      <Icon value={doc.icon} color={doc.color ?? undefined} />
                    ) : (
                      <DocumentIcon />
                    )
                  }
                />
              ))}
            </>
          )}
        </ResizingHeightContainer>
      </SearchResults>
    </>
  );
};

const Wrapper = styled(Flex)`
  pointer-events: all;
  gap: 8px;
`;

const SearchResults = styled(Scrollable)<{ $hasResults: boolean }>`
  background: ${s("menuBackground")};
  box-shadow: ${(props) => (props.$hasResults ? s("menuShadow") : "none")};
  clip-path: inset(0px -100px -100px -100px);
  position: absolute;
  top: 100%;
  width: 100%;
  height: auto;
  left: 0;
  margin-top: -6px;
  border-radius: 0 0 4px 4px;
  padding: ${(props) => (props.$hasResults ? "8px 0" : "0")};
  max-height: 240px;
  ${hideScrollbars()}

  @media (hover: none) and (pointer: coarse) {
    position: fixed;
    top: auto;
    bottom: 40px;
    border-radius: 0;
    max-height: 50vh;
    padding: 8px 8px 4px;
  }
`;

export default LinkEditor;
