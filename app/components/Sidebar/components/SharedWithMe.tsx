import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pagination } from "@shared/constants";
import type GroupMembership from "~/models/GroupMembership";
import type UserMembership from "~/models/UserMembership";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import { useDropToReorderUserMembership } from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import GroupLink from "./GroupLink";
import Header from "./Header";
import PlaceholderNotebooks from "./PlaceholderNotebooks";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarContext, { groupSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import { useHistory } from "react-router-dom";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import { patchLocation } from "~/utils/history";
function SharedWithMe() {
  const { ui, userMemberships, groupMemberships } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const history = useHistory();
  const locationSidebarContext = useLocationSidebarContext();
  usePaginatedRequest<GroupMembership>(groupMemberships.fetchAll);
  const { loading, next, end, error, page } =
    usePaginatedRequest<UserMembership>(userMemberships.fetchPage, {
      limit: Pagination.sidebarLimit,
    });
  // Drop to reorder note
  const [reorderProps, dropToReorderRef] = useDropToReorderUserMembership(() =>
    fractionalIndex(null, user.noteMemberships[0].index)
  );
  useEffect(() => {
    if (error) {
      toast.error(t("Could not load shared documents"));
    }
  }, [error, t]);
  useEffect(() => {
    const isContextInSharedSection =
      locationSidebarContext === "shared" ||
      locationSidebarContext?.startsWith("group");
    if (!ui.activeNoteId || isContextInSharedSection) {
      return;
    }
    const isActiveNoteSharedDirectly = user.noteMemberships.find(
      (m) => m.pathToNote(ui.activeNoteId!).length > 0
    );
    if (isActiveNoteSharedDirectly) {
      history.push(
        patchLocation(history.location, {
          state: {
            ...(history.location.state as Record<string, unknown>),
            sidebarContext: "shared",
          },
        })
      );
      return;
    }
    const groupWithActiveNote = user.groupsWithNoteMemberships.find((group) =>
      group.noteMemberships.some(
        (m) => m.pathToNote(ui.activeNoteId!).length > 0
      )
    );
    if (groupWithActiveNote) {
      history.push(
        patchLocation(history.location, {
          state: {
            ...(history.location.state as Record<string, unknown>),
            sidebarContext: groupSidebarContext(groupWithActiveNote.id),
          },
        })
      );
    }
    // `history` is read imperatively, the sidebar context should only be
    // recalculated when the active note or memberships change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ui.activeNoteId,
    locationSidebarContext,
    user.noteMemberships,
    user.groupsWithNoteMemberships,
  ]);
  if (!user.noteMemberships.length && !user.groupsWithNoteMemberships.length) {
    return null;
  }
  return (
    <SidebarContext.Provider value="shared">
      <Flex column>
        <Header id="shared" title={t("Shared with me")}>
          {user.groupsWithNoteMemberships.map((group) => (
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
            {user.noteMemberships
              .slice(0, page * Pagination.sidebarLimit)
              .map((membership) => (
                <SharedWithMeLink key={membership.id} membership={membership} />
              ))}
            {!loading && !end && (
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
                  <PlaceholderNotebooks />
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
