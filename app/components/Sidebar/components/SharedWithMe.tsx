import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import UserMembership from "~/models/UserMembership";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarLink from "./SidebarLink";
import StarredContext from "./StarredContext";

const STARRED_PAGINATION_LIMIT = 10;

function SharedWithMe() {
  const { userMemberships } = useStores();
  const { t } = useTranslation();

  const { loading, next, end, error, page } =
    usePaginatedRequest<UserMembership>(userMemberships.fetchPage, {
      limit: STARRED_PAGINATION_LIMIT,
    });

  // Drop to reorder document
  const [{ isOverReorder, isDraggingAnyStar }, dropToReorder] = useDrop({
    accept: "userMembership",
    drop: async (item: { userMembership: UserMembership }) => {
      void item.userMembership.save({
        index: fractionalIndex(null, userMemberships.orderedData[0].index),
      });
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
      isDraggingAnyStar: monitor.getItemType() === "userMembership",
    }),
  });

  if (error) {
    toast.error(t("Could not load shared documents"));
  }

  if (!userMemberships.orderedData.length) {
    return null;
  }

  return (
    <StarredContext.Provider value={true}>
      <Flex column>
        <Header id="shared_with_me" title={t("Shared with me")}>
          <Relative>
            {isDraggingAnyStar && (
              <DropCursor
                isActiveDrop={isOverReorder}
                innerRef={dropToReorder}
                position="top"
              />
            )}
            {userMemberships.orderedData
              .slice(0, page * STARRED_PAGINATION_LIMIT)
              .map((membership) => (
                <SharedWithMeLink
                  key={membership.id}
                  userMembership={membership}
                />
              ))}
            {!end && (
              <SidebarLink
                onClick={next}
                label={`${t("Show more")}…`}
                disabled={loading}
                depth={0}
              />
            )}
            {loading && (
              <Flex column>
                <DelayedMount>
                  <PlaceholderCollections />
                </DelayedMount>
              </Flex>
            )}
          </Relative>
        </Header>
      </Flex>
    </StarredContext.Provider>
  );
}

export default observer(SharedWithMe);
