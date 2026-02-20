import { observer } from "mobx-react";
import {
  ArrowIcon,
  CloseIcon,
  DocumentIcon,
  OpenIcon,
  ReturnIcon,
} from "outline-icons";
import type { Mark } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
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
import type { Dictionary } from "~/hooks/useDictionary";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import Input from "./Input";
import SuggestionsMenuItem from "./SuggestionsMenuItem";
import ToolbarButton from "./ToolbarButton";
import Tooltip from "./Tooltip";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import { useEditor } from "./EditorContext";

type Props = {
  mark?: Mark;
  dictionary: Dictionary;
  view: EditorView;
  autoFocus?: boolean;
  onLinkAdd: () => void;
  onLinkUpdate: () => void;
  onLinkRemove: () => void;
  onEscape: () => void;
  onClickOutside: (ev: MouseEvent | TouchEvent) => void;
  onClickBack: () => void;
};

const LinkEditor: React.FC<Props> = ({
  mark,
  dictionary,
  view,
  autoFocus,
  onLinkAdd,
  onLinkUpdate,
  onLinkRemove,
  onEscape,
  onClickOutside,
  onClickBack,
}) => {
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
    }, [documents, query])
  );

  useEffect(() => {
    if (trimmedQuery) {
      void request();
    }
  }, [trimmedQuery, request]);

  useOnClickOutside(wrapperRef, (ev) => {
    // If the link is totally empty or only spaces then remove the mark
    if (!trimmedQuery) {
      return removeLink();
    }

    // If the link in input is non-empty and same as it was when the editor opened, nothing to do
    if (trimmedQuery === initialValue) {
      onClickOutside(ev);
      return;
    }

    if (!mark) {
      return addLink(trimmedQuery);
    }

    updateLink(trimmedQuery);
  });

  const openLink = React.useCallback(() => {
    commands["openLink"]();
  }, []);

  const removeLink = React.useCallback(() => {
    commands["removeLink"]();
    onLinkRemove();
  }, [commands, onLinkRemove]);

  const updateLink = (link: string) => {
    if (!link) {
      return;
    }
    commands["updateLink"]({ href: sanitizeUrl(link) ?? "" });
    onLinkUpdate();
  };

  const addLink = (link: string) => {
    if (!link) {
      return;
    }
    commands["addLink"]({ href: sanitizeUrl(link) ?? "" });
    onLinkAdd();
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
          !mark ? addLink(selectedDoc.url) : updateLink(selectedDoc.url);
        } else if (!trimmedQuery) {
          removeLink();
        } else if (!mark) {
          addLink(trimmedQuery);
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

        onEscape();
        return;
      }
    }
  };

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setQuery(newValue);
    setSelectedIndex(-1);
  };

  const hasResults = !!results.length;

  const isInternal = isInternalUrl(query);
  const actions = [
    {
      tooltip: isInternal ? dictionary.goToLink : dictionary.openLink,
      icon: isInternal ? <ArrowIcon /> : <OpenIcon />,
      visible: true,
      disabled: !query,
      handler: openLink,
    },
    {
      tooltip: dictionary.removeLink,
      icon: <CloseIcon />,
      visible: view.editable,
      disabled: false,
      handler: removeLink,
    },
    {
      tooltip: dictionary.formattingControls,
      icon: <ReturnIcon />,
      visible: view.editable,
      disabled: false,
      handler: onClickBack,
    },
  ];

  return (
    <div ref={wrapperRef}>
      <InputWrapper>
        <Input
          ref={inputRef}
          value={query}
          placeholder={dictionary.searchOrPasteLink}
          onKeyDown={handleKeyDown}
          onChange={handleSearch}
          onFocus={handleSearch}
          autoFocus={autoFocus}
          readOnly={!view.editable}
        />
        {actions.map((action, index) => {
          if (!action.visible) {
            return null;
          }

          return (
            <Tooltip key={index} content={action.tooltip}>
              <ToolbarButton
                onClick={action.handler}
                disabled={action.disabled}
              >
                {action.icon}
              </ToolbarButton>
            </Tooltip>
          );
        })}
      </InputWrapper>
      <SearchResults $hasResults={hasResults}>
        <ResizingHeightContainer>
          {hasResults && (
            <>
              {results.map((doc, index) => (
                <SuggestionsMenuItem
                  onClick={() => {
                    !mark ? addLink(doc.path) : updateLink(doc.path);
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
                      <Icon
                        value={doc.icon}
                        initial={doc.initial}
                        color={doc.color ?? undefined}
                      />
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
  align-items: center;
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
    bottom: 46px;
    border-radius: 0;
    max-height: 50vh;
    padding: 8px 8px 4px;
  }
`;

export default observer(LinkEditor);
