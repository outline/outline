import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import { DEFAULT_PAGINATION_LIMIT } from "~/stores/BaseStore";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import InputSearch from "~/components/InputSearch";
import PaginatedList from "~/components/PaginatedList";
import Popover from "~/components/Popover";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import SharePopover from "../scenes/Document/components/SharePopover";
import SearchListItem from "./SearchListItem";

type Props = { shareId: string };
type SearchFunction = (options: Record<string, any>) => any;

function ShareButton({ shareId }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const theme = useTheme();

  const popover = usePopoverState({
    placement: "bottom-start",
    unstable_offset: [-24, 0],
    modal: true,
  });

  const [query, setQuery] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState<SearchFunction | null>(
    null
  );

  const searchResults = documents.searchResults(query);

  // TODO style the result list in an acceptable way
  // TODO: debounce the search function

  // TODO: get all the keyboard stuff right
  // TODO  pass the query into the "options" prop of paginated list, which gets spread into the funciton call

  // TODO: render the items in a way that looks good, probably with HTML
  // TODO: scope the search by the shareId
  // TODO write tests for that

  // TODO think about shrinking the context preview

  // right now I'm making a closure but could shim it into a function with one object argument

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    console.log({ value });

    if (value.length > 0) {
      popover.show();
      setSearchQuery(() => async (options: Record<string, any>) => {
        return await documents.search(value.trim(), options);
      });
      // loading state... might be handled by paginated list
    } else {
      popover.hide();
    }

    // unclear that we even need this in local state
    if (value) {
      setQuery(event.target.value);
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
        unstable_autoFocusOnShow={false}
        aria-label={t("Results")}
        style={{ zIndex: theme.depths.sidebar + 1 }}
        shrink
      >
        {searchQuery && (
          <PaginatedList
            items={searchResults}
            empty={
              <NoResults>{t("No results for {{query}}", { query })}</NoResults>
            }
            fetch={searchQuery}
            renderItem={(item) => (
              <SearchListItem
                document={item.document}
                context={item.context}
                highlight={query}
              />
            )}
          />
        )}
      </Popover>
    </>
  );
}

const NoResults = styled(Empty)`
  padding: 0 12px;
`;

export default observer(ShareButton);
