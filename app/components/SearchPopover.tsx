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

  const searchFunction = React.useCallback(
    async ({ query, ...options }: Record<string, any>) => {
      if (query?.length > 0) {
        return await documents.search(query, options);
      }
      return undefined;
    },
    [documents]
  );

  const [query, setQuery] = React.useState("");
  const searchResults = documents.searchResults(query);

  // TODO: debounce the search function
  // TODO: get all the keyboard stuff right
  // TODO: keep old search results when changing the query

  // TODO: render the items in a way that looks good, probably with HTML
  // TODO: scope the search by the shareId
  // TODO write tests for that

  // TODO think about shrinking the context preview

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
          fetch={searchFunction}
          empty={
            <NoResults>{t("No results for {{query}}", { query })}</NoResults>
          }
          loading={<PlaceholderList count={3} header={{ height: 20 }} />}
          renderItem={(item) => (
            <SearchListItem
              document={item.document}
              context={item.context}
              highlight={query}
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
