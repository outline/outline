import { observer } from "mobx-react";
import { ArrowIcon, CloseIcon, DocumentIcon, OpenIcon } from "outline-icons";
import { Mark } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { hideScrollbars, s } from "@shared/styles";
import { isInternalUrl, sanitizeUrl } from "@shared/utils/urls";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
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
import useOnClickOutside from "~/hooks/useOnClickOutside";
import { MenuItem } from "@shared/editor/types";
import { useEditor } from "./EditorContext";

type Props = {
  mark?: Mark;
  to: number;
  dictionary: Dictionary;
  view: EditorView;
};

enum Action {
  OPEN_LINK = "openLink",
  UPDATE_LINK = "updateLink",
  REMOVE_LINK = "removeLink",
}

type ActionDetails = {
  [key in Action]: MenuItem;
};

const getActions = (
  view: EditorView,
  query: string,
  dictionary: Dictionary
): ActionDetails => {
  const isInternal = isInternalUrl(query);
  return {
    [Action.OPEN_LINK]: {
      tooltip: isInternal ? dictionary.goToLink : dictionary.openLink,
      icon: isInternal ? <ArrowIcon /> : <OpenIcon />,
      disabled: !query,
    },
    [Action.REMOVE_LINK]: {
      tooltip: dictionary.removeLink,
      icon: <CloseIcon />,
      visible: view.editable,
    },
    [Action.UPDATE_LINK]: {
      visible: false,
    },
  };
};

const LinkEditor: React.FC<Props> = ({ mark, to, dictionary, view }) => {
  const getHref = () => sanitizeUrl(mark?.attrs.href) ?? "";
  const initialValue = getHref();
  const { commands } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  useOnClickOutside(wrapperRef, () => {
    // If the link is totally empty or only spaces then remove the mark
    if (!trimmedQuery) {
      return removeLink();
    }

    // If the link in input is non-empty and same as it was when the editor opened, nothing to do
    if (trimmedQuery === initialValue) {
      return;
    }

    updateLink(trimmedQuery);
  });

  const openLink = React.useCallback(() => {
    commands[Action.OPEN_LINK]();
  }, []);

  const removeLink = React.useCallback(() => {
    commands[Action.REMOVE_LINK]();
  }, []);

  const updateLink = (link: string) => {
    if (!link) {
      return;
    }
    commands[Action.UPDATE_LINK]({ href: sanitizeUrl(link) ?? "" });
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
          updateLink(selectedDoc.url);
        } else if (!trimmedQuery) {
          removeLink();
        } else {
          updateLink(trimmedQuery);
        }

        return;
      }
      case "Escape": {
        event.preventDefault();

        if (!initialValue) {
          return removeLink();
        }

        // Moving selection to end causes editor state to change,
        // forcing a re-render of the top-level editor component. As
        // a result, the new selection, being devoid of any link mark,
        // prevents LinkEditor from re-rendering.
        moveSelectionToEnd();
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
    setTimeout(() => updateLink(query), 0);
  };

  const hasResults = !!results.length;

  const actions = getActions(view, query, dictionary);

  return (
    <div ref={wrapperRef}>
      <InputWrapper ref={wrapperRef}>
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
        <Tooltip content={actions[Action.OPEN_LINK].tooltip}>
          <ToolbarButton
            onClick={openLink}
            disabled={actions[Action.OPEN_LINK].disabled}
          >
            {actions[Action.OPEN_LINK].icon}
          </ToolbarButton>
        </Tooltip>
        {actions[Action.REMOVE_LINK].visible && (
          <Tooltip content={actions[Action.REMOVE_LINK].tooltip}>
            <ToolbarButton
              onClick={removeLink}
              disabled={actions[Action.REMOVE_LINK].disabled}
            >
              {actions[Action.REMOVE_LINK].icon}
            </ToolbarButton>
          </Tooltip>
        )}
      </InputWrapper>
      <SearchResults $hasResults={hasResults}>
        <ResizingHeightContainer>
          {hasResults && (
            <>
              {results.map((doc, index) => (
                <SuggestionsMenuItem
                  onClick={() => {
                    updateLink(doc.url);
                  }}
                  onPointerMove={() => setSelectedIndex(index)}
                  selected={index === selectedIndex}
                  key={doc.id}
                  subtitle={
                    <DocumentBreadcrumb
                      document={doc}
                      onlyText
                      reverse
                      maxDepth={2}
                    />
                  }
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
    </div>
  );
};

const InputWrapper = styled(Flex)`
  pointer-events: all;
  gap: 6px;
  padding: 6px;
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
