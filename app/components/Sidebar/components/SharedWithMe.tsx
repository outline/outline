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
import { useDropToReorderUserMembership } from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import GroupLink from "./GroupLink";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";

function SharedWithMe() {
  const { userMemberships, groupMemberships } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();

  usePaginatedRequest<GroupMembership>(groupMemberships.fetchAll);

  const { loading, next, end, error, page } =
    usePaginatedRequest<UserMembership>(userMemberships.fetchPage, {
      limit: Pagination.sidebarLimit,
    });

  // Drop to reorder document
  const [reorderProps, dropToReorderRef] = useDropToReorderUserMembership(() =>
    fractionalIndex(null, user.documentMemberships[0].index)
  );

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load shared documents"));
    }
  }, [error, t]);

  if (
    !user.documentMemberships.length &&
    !user.groupsWithDocumentMemberships.length
  ) {
    return null;
  }

  return (
    <SidebarContext.Provider value="shared">
      <Flex column>
        <Header id="shared" title={t("Shared with me")}>
          {user.groupsWithDocumentMemberships.map((group) => (
            <GroupLink key={group.id} group={group} />
          ))}
          <Relative>
            {reorderProps.isDragging && (
              <DropCursor
                isActiveDrop={reorderProps.isOverCursor}
                innerRef={dropToReorderRef}
                position="top"
              />
            )}
            {user.documentMemberships
              .slice(0, page * Pagination.sidebarLimit)
              .map((membership) => (
                <SharedWithMeLink key={membership.id} membership={membership} />
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
    </SidebarContext.Provider>
  );
}

export default observer(SharedWithMe);
