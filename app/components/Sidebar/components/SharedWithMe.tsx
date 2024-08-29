import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pagination } from "@shared/constants";
import GroupMembership from "~/models/GroupMembership";
import UserMembership from "~/models/UserMembership";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SharedContext from "./SharedContext";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarLink from "./SidebarLink";
import { useDropToReorderUserMembership } from "./useDragAndDrop";

function SharedWithMe() {
  const { userMemberships, groupMemberships } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();

  const { loading, next, end, error, page } =
    usePaginatedRequest<UserMembership>(userMemberships.fetchPage, {
      limit: Pagination.sidebarLimit,
    });

  usePaginatedRequest<GroupMembership>(groupMemberships.fetchPage, {
    limit: Pagination.sidebarLimit,
  });

  // Drop to reorder document
  const [reorderMonitor, dropToReorderRef] = useDropToReorderUserMembership(
    () => fractionalIndex(null, user.memberships[0].index)
  );

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load shared documents"));
    }
  }, [error, t]);

  // TODO
  if (
    !user.memberships.length &&
    !groupMemberships.orderedData.filter((m) => m.documentId).length
  ) {
    return null;
  }

  return (
    <SharedContext.Provider value={true}>
      <Flex column>
        <Header id="shared" title={t("Shared with me")}>
          <Relative>
            {reorderMonitor.isDragging && (
              <DropCursor
                isActiveDrop={reorderMonitor.isOverCursor}
                innerRef={dropToReorderRef}
                position="top"
              />
            )}
            {groupMemberships.orderedData.map((membership) => (
              <SharedWithMeLink
                key={membership.id}
                userMembership={membership}
              />
            ))}
            {user.memberships
              .slice(0, page * Pagination.sidebarLimit)
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
    </SharedContext.Provider>
  );
}

export default observer(SharedWithMe);
