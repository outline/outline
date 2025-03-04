import { observer } from "mobx-react";
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
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
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
  const [query, setQuery] = useState(initialValue);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { documents } = useStores();

  const trimmedQuery = query.trim();
  const results = trimmedQuery
    ? documents.findByQuery(trimmedQuery, { maxResults: 25 })
    : [];

  const { request } = useRequest(
    React.useCallback(async () => {
      const res = await client.post("/suggestions.mention", { query });
      res.data.documents.map(documents.add);
    }, [query])
  );

  useEffect(() => {
    if (trimmedQuery) {
      void request();
    }
  }, [trimmedQuery, request]);

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
      if (trimmedQuery === initialValue) {
        return;
      }

      // If the link is totally empty or only spaces then remove the mark
      if (!trimmedQuery) {
        return handleRemoveLink();
      }

      save(trimmedQuery, trimmedQuery);
    };
  }, [trimmedQuery, initialValue]);

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
          save(trimmedQuery, trimmedQuery);
        }

        if (initialSelectionLength) {
          moveSelectionToEnd();
        }
        return;
      }
      case "Escape": {
        event.preventDefault();

        if (initialValue) {
          setQuery(initialValue);
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
    setQuery(newValue);
    setSelectedIndex(-1);
  };

  const handlePaste = () => {
    setTimeout(() => save(query, query), 0);
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

  const isInternal = isInternalUrl(query);
  const hasResults = !!results.length;

  return (
    <>
      <Wrapper>
        <Input
          ref={inputRef}
          value={query}
          placeholder={dictionary.searchOrPasteLink}
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
          <ToolbarButton onClick={handleOpenLink} disabled={!query}>
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
                  onPointerMove={() => setSelectedIndex(index)}
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
  padding: ${(props) => (props.$hasResults ? "6px" : "0")};
  max-height: 240px;
  pointer-events: all;

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

export default observer(LinkEditor);
