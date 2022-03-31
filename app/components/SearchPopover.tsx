import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import Empty from "~/components/Empty";
import InputSearch from "~/components/InputSearch";
import Placeholder from "~/components/List/Placeholder";
import PaginatedList from "~/components/PaginatedList";
import Popover from "~/components/Popover";
import useStores from "~/hooks/useStores";
import SearchListItem from "./SearchListItem";

type Props = { shareId: string };

function SearchPopover({ shareId }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const theme = useTheme();

  const popover = usePopoverState({
    placement: "bottom-start",
    unstable_offset: [-24, 0],
    modal: true,
  });

  const [query, setQuery] = React.useState("");
  const searchResults = documents.searchResults(query);

  const performSearch = React.useCallback(
    async ({ query, ...options }: Record<string, any>) => {
      if (query?.length > 0) {
        return await documents.search(query, { shareId, ...options });
      }
      return undefined;
    },
    [documents, shareId]
  );

  const handleSearch = React.useMemo(
    () =>
      debounce(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        if (value.length) {
          popover.show();
          setQuery(event.target.value.trim());
        } else {
          popover.hide();
        }
      }, 1000),
    [popover]
  );

  const searchInputRef = popover.unstable_referenceRef;
  const firstSearchItem = React.useRef<HTMLAnchorElement>(null);

  const handleEscapeList = React.useCallback(
    () => searchInputRef?.current?.focus(),
    [searchInputRef]
  );

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      if (searchResults?.length) {
        popover.show();
      }
    }

    if (ev.key === "ArrowDown" && !ev.shiftKey) {
      if (searchResults?.length) {
        if (ev.currentTarget.value.length === ev.currentTarget.selectionStart) {
          popover.show();
        }
        firstSearchItem.current?.focus();
      }
    }

    if (ev.key === "ArrowUp") {
      if (popover.visible) {
        popover.hide();
        ev.preventDefault();
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
  };

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => {
          // props assumes the disclosure is a button, but we want a type-ahead
          // so we take the aria props, and ref and ignore the event handlers
          return (
            <InputSearch
              aria-controls={props["aria-controls"]}
              aria-expanded={props["aria-expanded"]}
              aria-haspopup={props["aria-haspopup"]}
              ref={props.ref}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
            />
          );
        }}
      </PopoverDisclosure>

      <Popover
        {...popover}
        aria-label={t("Results")}
        unstable_autoFocusOnShow={false}
        style={{ zIndex: theme.depths.sidebar + 1 }}
        shrink
      >
        <PaginatedList
          options={{ query }}
          items={searchResults}
          fetch={performSearch}
          onEscape={handleEscapeList}
          empty={
            <NoResults>{t("No results for {{query}}", { query })}</NoResults>
          }
          loading={<PlaceholderList count={3} header={{ height: 20 }} />}
          renderItem={(item, index, compositeProps) => (
            <SearchListItem
              key={item.document.id}
              shareId={shareId}
              ref={index === 0 ? firstSearchItem : undefined}
              document={item.document}
              context={item.context}
              highlight={query}
              onClick={popover.hide}
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
`;

const PlaceholderList = styled(Placeholder)`
  padding: 6px 12px;
`;

export default observer(SearchPopover);
