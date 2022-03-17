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

  const searchInputRef = popover.unstable_referenceRef;

  const performSearch = React.useMemo(
    () =>
      debounce(async ({ query, ...options }: Record<string, any>) => {
        console.log({ query });

        if (query?.length > 0) {
          return await documents.search(query, options);
        }
        return undefined;
      }, 1000),
    []
  );

  const firstSearchItem = React.useRef<HTMLAnchorElement>(null);

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      console.log("ENTER KEY");
      if (searchResults?.length) {
        popover.show();
      }
    }

    if (ev.key === "ArrowDown") {
      console.log("ARROW DOWN");
      if (searchResults?.length) {
        popover.show();
        firstSearchItem.current?.focus();
      }
      ev.preventDefault();
    }
  };

  // TODO: scope the search by the shareId and not the user
  // TODO write tests for that

  // TODO think about shrinking the context preview
  // TODO: keep old search results when changing the query — will require debounce + incrementer to tick the result set number
  // update search results on a tick, and only display when ticked up (call inside useEffect)

  // right now I'm making a closure but could shim it into a function with one object argument

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (value.length) {
      popover.show();
      setQuery(event.target.value.trim());
    } else {
      popover.hide();
    }
  };

  // if the input has any stuff, then show the disclosure

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
          onEscape={() => searchInputRef?.current?.focus()}
          empty={
            <NoResults>{t("No results for {{query}}", { query })}</NoResults>
          }
          loading={<PlaceholderList count={3} header={{ height: 20 }} />}
          renderItem={(item, index, compositeProps) => (
            <SearchListItem
              key={item.document.id}
              ref={index === 0 ? firstSearchItem : undefined}
              document={item.document}
              context={item.context}
              highlight={query}
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
