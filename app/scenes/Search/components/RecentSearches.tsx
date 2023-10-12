import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CompositeItem } from "reakit/Composite";
import styled from "styled-components";
import { s } from "@shared/styles";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { hover } from "~/styles";
import { searchPath } from "~/utils/routeHelpers";

type Props = {
  /** Callback when the Escape key is pressed while navigating the list */
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
};

function RecentSearches(
  { onEscape }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { searches } = useStores();
  const { t } = useTranslation();
  const [isPreloaded] = React.useState(searches.recent.length > 0);

  React.useEffect(() => {
    void searches.fetchPage({});
  }, [searches]);

  const content = searches.recent.length ? (
    <>
      <Heading>{t("Recent searches")}</Heading>
      <List>
        <ArrowKeyNavigation
          ref={ref}
          onEscape={onEscape}
          aria-label={t("Search Results")}
        >
          {(compositeProps) =>
            searches.recent.map((searchQuery) => (
              <ListItem key={searchQuery.id}>
                <CompositeItem
                  as={RecentSearch}
                  to={searchPath(searchQuery.query)}
                  role="menuitem"
                  {...compositeProps}
                >
                  {searchQuery.query}
                  <Tooltip tooltip={t("Remove search")} delay={150}>
                    <RemoveButton
                      aria-label={t("Remove search")}
                      onClick={async (ev) => {
                        ev.preventDefault();
                        await searchQuery.delete();
                      }}
                    >
                      <CloseIcon />
                    </RemoveButton>
                  </Tooltip>
                </CompositeItem>
              </ListItem>
            ))
          }
        </ArrowKeyNavigation>
      </List>
    </>
  ) : null;

  return isPreloaded ? content : <Fade>{content}</Fade>;
}

const Heading = styled.h2`
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  color: ${s("textSecondary")};
  margin-bottom: 0;
`;

const List = styled.ol`
  padding: 0;
  margin-top: 8px;
`;

const ListItem = styled.li`
  font-size: 14px;
  padding: 0;
  list-style: none;
  position: relative;

  &:before {
    content: "·";
    color: ${s("textTertiary")};
    position: absolute;
    left: -8px;
  }
`;

const RemoveButton = styled(NudeButton)`
  opacity: 0;
  color: ${s("textTertiary")};

  &:hover {
    color: ${s("text")};
  }
`;

const RecentSearch = styled(Link)`
  display: flex;
  justify-content: space-between;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  padding: 1px 4px;
  border-radius: 4px;

  &:focus-visible {
    outline: none;
  }

  &:focus,
  &: ${hover} {
    color: ${s("text")};
    background: ${s("secondaryBackground")};

    ${RemoveButton} {
      opacity: 1;
    }
  }
`;

export default observer(React.forwardRef(RecentSearches));
