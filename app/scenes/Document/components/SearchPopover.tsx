import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import { useTheme } from "styled-components";
import { DEFAULT_PAGINATION_LIMIT } from "~/stores/BaseStore";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import InputSearch from "~/components/InputSearch";
import PaginatedList from "~/components/PaginatedList";
import Popover from "~/components/Popover";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import SharePopover from "./SharePopover";

type Props = { shareId: string };

function ShareButton({ shareId }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const theme = useTheme();

  const [searchResults, setSearchResults] = React.useState([]);

  const popover = usePopoverState({
    placement: "bottom-start",
    unstable_offset: [-24, 0],
    modal: true,
  });

  const [query, setQuery] = React.useState("");

  // NOTE: pass the query into the "options" prop of paginated list, which gets spread
  // into the function call
  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    console.log({ value });
    if (value.length > 0) {
      popover.show();

      const params = {
        offset: 0,
        limit: DEFAULT_PAGINATION_LIMIT,
        shareId,
      };

      try {
        const results = await documents.search(value, params);

        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          this.allowLoadMore = false;
        } else {
          this.offset += DEFAULT_PAGINATION_LIMIT;
        }
      } catch (err) {
        this.lastQuery = "";
        throw err;
      } finally {
        this.isLoading = false;
      }
    } else {
      popover.hide();
    }

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
      >
        HELLO THIS IS SEARCH RESULT: {query}
        <br />
        <PaginatedList
          items={searchResults}
          empty={<Empty>{t("No groups have been created yet")}</Empty>}
          fetch={fetchPage}
          renderItem={(item) => <div>{item.id}</div>}
        />
      </Popover>
    </>
  );
}

export default observer(ShareButton);
