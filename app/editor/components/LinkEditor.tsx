import {
  ArrowIcon,
  DocumentIcon,
  CloseIcon,
  PlusIcon,
  OpenIcon,
} from "outline-icons";
import { Mark } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import { s, hideScrollbars } from "@shared/styles";
import { isInternalUrl, sanitizeUrl } from "@shared/utils/urls";
import Flex from "~/components/Flex";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scrollable from "~/components/Scrollable";
import { Dictionary } from "~/hooks/useDictionary";
import { ToastOptions } from "~/types";
import Logger from "~/utils/Logger";
import Input from "./Input";
import LinkSearchResult from "./LinkSearchResult";
import ToolbarButton from "./ToolbarButton";
import Tooltip from "./Tooltip";

export type SearchResult = {
  title: string;
  subtitle?: string;
  url: string;
};

type Props = {
  mark?: Mark;
  from: number;
  to: number;
  dictionary: Dictionary;
  onRemoveLink?: () => void;
  onCreateLink?: (title: string) => Promise<void>;
  onSearchLink?: (term: string) => Promise<SearchResult[]>;
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
  onShowToast: (message: string, options?: ToastOptions) => void;
  view: EditorView;
};

type State = {
  results: {
    [keyword: string]: SearchResult[];
  };
  value: string;
  previousValue: string;
  selectedIndex: number;
};

class LinkEditor extends React.Component<Props, State> {
  discardInputValue = false;
  initialValue = this.href;
  initialSelectionLength = this.props.to - this.props.from;
  resultsRef = React.createRef<HTMLDivElement>();

  state: State = {
    selectedIndex: -1,
    value: this.href,
    previousValue: "",
    results: {},
  };

  get href(): string {
    return sanitizeUrl(this.props.mark?.attrs.href) ?? "";
  }

  get selectedText(): string {
    const { state } = this.props.view;
    const selectionText = state.doc.cut(
      state.selection.from,
      state.selection.to
    ).textContent;

    return selectionText.trim();
  }

  get suggestedLinkTitle(): string {
    return this.state.value.trim() || this.selectedText;
  }

  componentWillUnmount = () => {
    // If we discarded the changes then nothing to do
    if (this.discardInputValue) {
      return;
    }

    // If the link is the same as it was when the editor opened, nothing to do
    if (this.state.value === this.initialValue) {
      return;
    }

    // If the link is totally empty or only spaces then remove the mark
    const href = (this.state.value || "").trim();
    if (!href) {
      return this.handleRemoveLink();
    }

    this.save(href, href);
  };

  save = (href: string, title?: string): void => {
    href = href.trim();

    if (href.length === 0) {
      return;
    }

    this.discardInputValue = true;
    const { from, to } = this.props;
    href = sanitizeUrl(href) ?? "";

    this.props.onSelectLink({ href, title, from, to });
  };

  handleKeyDown = (event: React.KeyboardEvent): void => {
    const results = this.results;

    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        const { selectedIndex, value } = this.state;
        const { onCreateLink } = this.props;

        if (selectedIndex >= 0) {
          const result = results[selectedIndex];
          if (result) {
            this.save(result.url, result.title);
          } else if (onCreateLink && selectedIndex === results.length) {
            void this.handleCreateLink(this.suggestedLinkTitle);
          }
        } else {
          // saves the raw input as href
          this.save(value, value);
        }

        if (this.initialSelectionLength) {
          this.moveSelectionToEnd();
        }

        return;
      }

      case "Escape": {
        event.preventDefault();

        if (this.initialValue) {
          this.setState({ value: this.initialValue }, this.moveSelectionToEnd);
        } else {
          this.handleRemoveLink();
        }
        return;
      }

      case "ArrowUp": {
        if (event.shiftKey) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const prevIndex = this.state.selectedIndex - 1;

        this.setState({
          selectedIndex: Math.max(-1, prevIndex),
        });
        return;
      }

      case "ArrowDown":
      case "Tab": {
        if (event.shiftKey) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        const { selectedIndex } = this.state;
        const total = results.length;
        const nextIndex = selectedIndex + 1;

        this.setState({
          selectedIndex: Math.min(nextIndex, total),
        });
        return;
      }
    }
  };

  handleFocusLink = (selectedIndex: number) => {
    this.setState({ selectedIndex });
  };

  handleSearch = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const value = event.target.value;

    this.setState({
      value,
      selectedIndex: -1,
    });

    const trimmedValue = value.trim() || this.selectedText;

    if (trimmedValue && this.props.onSearchLink) {
      try {
        const results = await this.props.onSearchLink(trimmedValue);
        this.setState((state) => ({
          results: {
            ...state.results,
            [trimmedValue]: results,
          },
          previousValue: trimmedValue,
        }));
      } catch (err) {
        Logger.error("Error searching for link", err);
      }
    }
  };

  handlePaste = (): void => {
    setTimeout(() => this.save(this.state.value, this.state.value), 0);
  };

  handleOpenLink = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();

    try {
      this.props.onClickLink(this.href, event);
    } catch (err) {
      this.props.onShowToast(this.props.dictionary.openLinkError);
    }
  };

  handleCreateLink = async (value: string) => {
    this.discardInputValue = true;
    const { onCreateLink } = this.props;

    value = value.trim();
    if (value.length === 0) {
      return;
    }

    if (onCreateLink) {
      return onCreateLink(value);
    }
  };

  handleRemoveLink = (): void => {
    this.discardInputValue = true;

    const { from, to, mark, view, onRemoveLink } = this.props;
    const { state, dispatch } = this.props.view;

    if (mark) {
      dispatch(state.tr.removeMark(from, to, mark));
    }

    onRemoveLink?.();
    view.focus();
  };

  handleSelectLink =
    (url: string, title: string) => (event: React.MouseEvent) => {
      event.preventDefault();
      this.save(url, title);

      if (this.initialSelectionLength) {
        this.moveSelectionToEnd();
      }
    };

  moveSelectionToEnd = () => {
    const { to, view } = this.props;
    const { state, dispatch } = view;
    const nextSelection = Selection.findFrom(state.tr.doc.resolve(to), 1, true);
    if (nextSelection) {
      dispatch(state.tr.setSelection(nextSelection));
    }
    view.focus();
  };

  get results() {
    const { value } = this.state;
    return (
      this.state.results[value.trim()] ||
      this.state.results[this.state.previousValue] ||
      []
    );
  }

  render() {
    const { dictionary } = this.props;
    const { value, selectedIndex } = this.state;
    const results = this.results;
    const looksLikeUrl = value.match(/^https?:\/\//i);
    const suggestedLinkTitle = this.suggestedLinkTitle;
    const isInternal = isInternalUrl(value);

    const showCreateLink =
      !!this.props.onCreateLink &&
      !(suggestedLinkTitle === this.initialValue) &&
      suggestedLinkTitle.length > 0 &&
      !looksLikeUrl;

    const hasResults =
      !!suggestedLinkTitle && (showCreateLink || results.length > 0);

    return (
      <Wrapper>
        <Input
          value={value}
          placeholder={
            showCreateLink
              ? dictionary.findOrCreateDoc
              : dictionary.searchOrPasteLink
          }
          onKeyDown={this.handleKeyDown}
          onPaste={this.handlePaste}
          onChange={this.handleSearch}
          onFocus={this.handleSearch}
          autoFocus={this.href === ""}
        />

        <Tooltip
          tooltip={isInternal ? dictionary.goToLink : dictionary.openLink}
        >
          <ToolbarButton onClick={this.handleOpenLink} disabled={!value}>
            {isInternal ? <ArrowIcon /> : <OpenIcon />}
          </ToolbarButton>
        </Tooltip>
        <Tooltip tooltip={dictionary.removeLink}>
          <ToolbarButton onClick={this.handleRemoveLink}>
            <CloseIcon />
          </ToolbarButton>
        </Tooltip>

        <SearchResults
          ref={this.resultsRef}
          $hasResults={hasResults}
          role="menu"
        >
          <ResizingHeightContainer>
            {hasResults && (
              <>
                {results.map((result, index) => (
                  <LinkSearchResult
                    key={result.url}
                    title={result.title}
                    subtitle={result.subtitle}
                    icon={<DocumentIcon />}
                    onPointerMove={() => this.handleFocusLink(index)}
                    onClick={this.handleSelectLink(result.url, result.title)}
                    selected={index === selectedIndex}
                    containerRef={this.resultsRef}
                  />
                ))}

                {showCreateLink && (
                  <LinkSearchResult
                    key="create"
                    containerRef={this.resultsRef}
                    title={suggestedLinkTitle}
                    subtitle={dictionary.createNewDoc}
                    icon={<PlusIcon />}
                    onPointerMove={() => this.handleFocusLink(results.length)}
                    onClick={async () => {
                      await this.handleCreateLink(suggestedLinkTitle);

                      if (this.initialSelectionLength) {
                        this.moveSelectionToEnd();
                      }
                    }}
                    selected={results.length === selectedIndex}
                  />
                )}
              </>
            )}
          </ResizingHeightContainer>
        </SearchResults>
      </Wrapper>
    );
  }
}

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
