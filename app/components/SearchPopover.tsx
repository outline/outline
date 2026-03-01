import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Empty from "~/components/Empty";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import Placeholder from "~/components/List/Placeholder";
import PaginatedList from "~/components/PaginatedList";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/primitives/Popover";
import { id as bodyContentId } from "~/components/SkipNavContent";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import type { SearchResult } from "~/types";
import SearchListItem from "./SearchListItem";

interface Props extends React.HTMLAttributes<HTMLInputElement> {
  shareId: string;
  className?: string;
}

function SearchPopover({ shareId, className }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const focusRef = React.useRef<HTMLElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const firstSearchItem = React.useRef<HTMLAnchorElement>(null);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    SearchResult[] | undefined
  >();

  // Cache search results by query string to avoid redundant API calls
  const cacheRef = React.useRef(new Map<string, SearchResult[]>());
  const queryRef = React.useRef(query);
  queryRef.current = query;

  // When the query changes, restore cached results (including empty) or keep
  // previous results visible until new results arrive to avoid layout shift
  React.useEffect(() => {
    if (!query) {
      setSearchResults(undefined);
      return;
    }

    const cached = cacheRef.current.get(query);
    if (cached !== undefined) {
      setSearchResults(cached);
      if (cached.length) {
        setOpen(true);
      }
    }
  }, [query]);

  const performSearch = React.useCallback(
    async ({
      query: searchQuery,
      offset = 0,
      ...options
    }: Record<string, any>) => {
      if (!searchQuery?.length) {
        return undefined;
      }

      // Return cached results for first-page lookups
      if (offset === 0 && cacheRef.current.has(searchQuery)) {
        return cacheRef.current.get(searchQuery)!;
      }

      // Force offset to 0 for new queries — PaginatedList's reset() sets
      // offset via setState but fetchResults still uses the stale value
      // from its closure
      if (!cacheRef.current.has(searchQuery)) {
        offset = 0;
      }

      const response = await documents.search({
        query: searchQuery,
        shareId,
        offset,
        ...options,
      });

      // Build complete result set in cache: replace for new queries, append
      // for pagination of an existing query
      const existing = cacheRef.current.get(searchQuery);
      cacheRef.current.set(
        searchQuery,
        existing ? [...existing, ...response] : response
      );

      // Only update state if this query is still current to prevent stale
      // results from overwriting newer results after a race condition
      if (queryRef.current === searchQuery) {
        setSearchResults(cacheRef.current.get(searchQuery)!);
        setOpen(true);
      }

      return response;
    },
    [documents, shareId]
  );

  const debouncedSetQuery = React.useMemo(
    () =>
      debounce((value: string) => {
        setQuery(value);
        setOpen(!!value);
      }, 250),
    []
  );

  const handleSearchInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetQuery(event.target.value.trim());
    },
    [debouncedSetQuery]
  );

  React.useEffect(() => () => debouncedSetQuery.cancel(), [debouncedSetQuery]);

  const handleEscapeList = React.useCallback(
    () => searchInputRef.current?.focus(),
    []
  );

  const handleSearchInputFocus = React.useCallback(() => {
    focusRef.current = searchInputRef.current;
  }, []);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.nativeEvent.isComposing) {
        return;
      }

      if (ev.key === "Enter") {
        if (searchResults) {
          setOpen(true);
        }
        return;
      }

      if (ev.key === "ArrowDown" && !ev.shiftKey) {
        if (ev.currentTarget.value.length) {
          const atEnd =
            ev.currentTarget.value.length === ev.currentTarget.selectionStart;

          if (atEnd) {
            setOpen(true);
          }
          if (open || atEnd) {
            ev.preventDefault();
            firstSearchItem.current?.focus();
          }
        }
        return;
      }

      if (ev.key === "ArrowUp") {
        if (open) {
          setOpen(false);
          if (!ev.shiftKey) {
            ev.preventDefault();
          }
        }
        if (ev.currentTarget.value && ev.currentTarget.selectionEnd === 0) {
          ev.currentTarget.selectionStart = 0;
          ev.currentTarget.selectionEnd = ev.currentTarget.value.length;
          ev.preventDefault();
        }
        return;
      }

      if (ev.key === "Escape" && open) {
        setOpen(false);
        ev.preventDefault();
      }
    },
    [open, searchResults]
  );

  const handleSearchItemClick = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      focusRef.current = document.getElementById(bodyContentId);
    }
  }, []);

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
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverAnchor>
        <StyledInputSearch
          role="combobox"
          aria-controls="search-results"
          aria-expanded={open}
          aria-haspopup="listbox"
          ref={searchInputRef}
          onChange={handleSearchInputChange}
          onFocus={handleSearchInputFocus}
          onKeyDown={handleKeyDown}
          className={className}
          label={t("Search")}
          labelHidden
        />
      </PopoverAnchor>
      <PopoverContent
        id="search-results"
        aria-label={t("Results")}
        side="bottom"
        align="start"
        shrink
        onEscapeKeyDown={handleEscapeList}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(event) => {
          const target = event.target as Element | null;
          if (target === searchInputRef.current) {
            event.preventDefault();
          }
        }}
      >
        <PaginatedList<SearchResult>
          role="listbox"
          options={{
            query,
            snippetMinWords: 10,
            snippetMaxWords: 11,
            limit: 10,
          }}
          items={searchResults}
          fetch={performSearch}
          onEscape={handleEscapeList}
          empty={
            <NoResults>{t("No results for {{query}}", { query })}</NoResults>
          }
          loading={<PlaceholderList count={3} header={{ height: 20 }} />}
          renderItem={(item, index) => (
            <SearchListItem
              key={item.document.id}
              shareId={shareId}
              ref={index === 0 ? firstSearchItem : undefined}
              document={item.document}
              context={item.context}
              highlight={query}
              onClick={handleSearchItemClick}
            />
          )}
        />
      </PopoverContent>
    </Popover>
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
