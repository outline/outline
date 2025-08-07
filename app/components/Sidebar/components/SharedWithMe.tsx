import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useEffect } from "react";
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
import SidebarContext, { groupSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import { useHistory } from "react-router-dom";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";

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

  // Drop to reorder document
  const [reorderProps, dropToReorderRef] = useDropToReorderUserMembership(() =>
    fractionalIndex(null, user.documentMemberships[0].index)
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

    if (!ui.activeDocumentId || isContextInSharedSection) {
      return;
    }

    const isActiveDocSharedDirectly = user.documentMemberships.find(
      (m) => m.pathToDocument(ui.activeDocumentId!).length > 0
    );

    if (isActiveDocSharedDirectly) {
      history.push({
        ...history.location,
        state: {
          ...(history.location.state as Record<string, unknown>),
          sidebarContext: "shared",
        },
      });

      return;
    }

    const groupWithActiveDocument = user.groupsWithDocumentMemberships.find(
      (group) =>
        group.documentMemberships.some(
          (m) => m.pathToDocument(ui.activeDocumentId!).length > 0
        )
    );

    if (groupWithActiveDocument) {
      history.push({
        ...history.location,
        state: {
          ...(history.location.state as Record<string, unknown>),
          sidebarContext: groupSidebarContext(groupWithActiveDocument.id),
        },
      });
    }
  }, [
    ui.activeDocumentId,
    locationSidebarContext,
    user.documentMemberships,
    user.groupsWithDocumentMemberships,
  ]);

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
