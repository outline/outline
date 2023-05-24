import { debounce } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import Empty from "~/components/Empty";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import Placeholder from "~/components/List/Placeholder";
import PaginatedList, { PaginatedItem } from "~/components/PaginatedList";
import Popover from "~/components/Popover";
import { id as bodyContentId } from "~/components/SkipNavContent";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import { SearchResult } from "~/types";
import SearchListItem from "./SearchListItem";

type Props = { shareId: string };

function SearchPopover({ shareId }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const focusRef = React.useRef<HTMLElement | null>(null);

  const popover = usePopoverState({
    placement: "bottom-start",
    unstable_offset: [-24, 0],
    modal: true,
  });

  const [query, setQuery] = React.useState("");
  const searchResults = documents.searchResults(query);

  const [cachedQuery, setCachedQuery] = React.useState(query);
  const [cachedSearchResults, setCachedSearchResults] = React.useState<
    PaginatedItem[] | undefined
  >(searchResults);

  React.useEffect(() => {
    if (searchResults) {
      setCachedQuery(query);
      setCachedSearchResults(searchResults);
      popover.show();
    }
  }, [searchResults, query, popover.show]);

  const performSearch = React.useCallback(
    async ({ query, ...options }) => {
      if (query?.length > 0) {
        return await documents.search(query, { shareId, ...options });
      }
      return undefined;
    },
    [documents, shareId]
  );

  const handleSearchInputChange = React.useMemo(
    () =>
      debounce(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setQuery(value.trim());

        // covers edge case: user manually dismisses popover then
        // quickly edits input resulting in no change in query
        // the useEffect that normally shows the popover will miss it
        if (value === cachedQuery) {
          popover.show();
        }

        if (!value.length) {
          popover.hide();
        }
      }, 300),
    [popover, cachedQuery]
  );

  const searchInputRef =
    popover.unstable_referenceRef as React.RefObject<HTMLInputElement>;

  const firstSearchItem = React.useRef<HTMLAnchorElement>(null);

  const handleEscapeList = React.useCallback(
    () => searchInputRef?.current?.focus(),
    [searchInputRef]
  );

  const handleSearchInputFocus = React.useCallback(() => {
    focusRef.current = searchInputRef.current;
  }, []);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        if (searchResults) {
          popover.show();
        }
      }

      if (ev.key === "ArrowDown" && !ev.shiftKey) {
        if (ev.currentTarget.value.length) {
          if (
            ev.currentTarget.value.length === ev.currentTarget.selectionStart
          ) {
            popover.show();
          }
          firstSearchItem.current?.focus();
        }
      }

      if (ev.key === "ArrowUp") {
        if (popover.visible) {
          popover.hide();
          if (!ev.shiftKey) {
            ev.preventDefault();
          }
        }

        if (ev.currentTarget.value) {
          if (ev.currentTarget.selectionEnd === 0) {
            ev.currentTarget.selectionStart = 0;
            ev.currentTarget.selectionEnd = ev.currentTarget.value.length;
            ev.preventDefault();
          }
        }
      }

      if (ev.key === "Escape") {
        if (popover.visible) {
          popover.hide();
          ev.preventDefault();
        }
      }
    },
    [popover, searchResults]
  );

  const handleSearchItemClick = React.useCallback(() => {
    popover.hide();
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      focusRef.current = document.getElementById(bodyContentId);
    }
  }, [popover.hide]);

  useKeyDown("/", (ev) => {
    if (
      searchInputRef.current &&
      searchInputRef.current !== document.activeElement
    ) {
      searchInputRef.current.focus();
      ev.preventDefault();
    }
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          // props assumes the disclosure is a button, but we want a type-ahead
          // so we take the aria props, and ref and ignore the event handlers
          <StyledInputSearch
            aria-controls={props["aria-controls"]}
            aria-expanded={props["aria-expanded"]}
            aria-haspopup={props["aria-haspopup"]}
            ref={props.ref}
            onChange={handleSearchInputChange}
            onFocus={handleSearchInputFocus}
            onKeyDown={handleKeyDown}
          />
        )}
      </PopoverDisclosure>
      <Popover
        {...popover}
        aria-label={t("Results")}
        unstable_autoFocusOnShow={false}
        unstable_finalFocusRef={focusRef}
        style={{ zIndex: depths.sidebar + 1 }}
        shrink
      >
        <PaginatedList
          options={{ query, snippetMinWords: 10, snippetMaxWords: 11 }}
          items={cachedSearchResults}
          fetch={performSearch}
          onEscape={handleEscapeList}
          empty={
            <NoResults>{t("No results for {{query}}", { query })}</NoResults>
          }
          loading={<PlaceholderList count={3} header={{ height: 20 }} />}
          renderItem={(item: SearchResult, index, compositeProps) => (
            <SearchListItem
              key={item.document.id}
              shareId={shareId}
              ref={index === 0 ? firstSearchItem : undefined}
              document={item.document}
              context={item.context}
              highlight={cachedQuery}
              onClick={handleSearchItemClick}
              {...compositeProps}
            />
          )}
        />
      </Popover>
    </>
  );
}

const NoResults = styled(Empty)`
  padding: 0 12px;
  margin: 6px 0;
`;

const PlaceholderList = styled(Placeholder)`
  padding: 6px 12px;
`;

const StyledInputSearch = styled(InputSearch)`
  ${Outline} {
    border-radius: 16px;
  }
`;

export default observer(SearchPopover);
