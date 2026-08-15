import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { Pagination } from "@shared/constants";
import type UserMembership from "~/models/UserMembership";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import { createPrivateDocument } from "~/actions/definitions/documents";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { patchLocation } from "~/utils/history";
import { useDropToReorderUserMembership } from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarAction from "./SidebarAction";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";

function PrivateDocs() {
  const { ui, userMemberships } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);
  const history = useHistory();
  const locationSidebarContext = useLocationSidebarContext();

  const { loading, next, end, error, page } =
    usePaginatedRequest<UserMembership>(userMemberships.fetchPrivatePage, {
      limit: Pagination.sidebarLimit,
    });

  // Drop to reorder document
  const [reorderProps, dropToReorderRef] = useDropToReorderUserMembership(() =>
    fractionalIndex(null, user.privateDocumentMemberships[0]?.index ?? null)
  );

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load private documents"));
    }
  }, [error, t]);

  useEffect(() => {
    if (
      !ui.activeDocumentId ||
      locationSidebarContext === "private" ||
      locationSidebarContext?.startsWith("starred")
    ) {
      return;
    }

    const isActiveDocPrivate = user.privateDocumentMemberships.find(
      (m) => m.pathToDocument(ui.activeDocumentId!).length > 0
    );

    if (isActiveDocPrivate) {
      history.push(
        patchLocation(history.location, {
          state: {
            ...(history.location.state as Record<string, unknown>),
            sidebarContext: "private",
          },
        })
      );
    }
    // `history` is read imperatively, the sidebar context should only be
    // recalculated when the active document or memberships change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ui.activeDocumentId,
    locationSidebarContext,
    user.privateDocumentMemberships,
  ]);

  if (!can.createPrivateDocument) {
    return null;
  }

  return (
    <SidebarContext.Provider value="private">
      <Flex column>
        <Header id="private" title={t("Private")}>
          <Relative>
            {reorderProps.isDragging && (
              <DropCursor
                isActiveDrop={reorderProps.isOverCursor}
                innerRef={dropToReorderRef}
                position="top"
              />
            )}
            {user.privateDocumentMemberships
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
                  <PlaceholderCollections />
                </DelayedMount>
              </Flex>
            )}
            <SidebarAction action={createPrivateDocument} depth={0} />
          </Relative>
        </Header>
      </Flex>
    </SidebarContext.Provider>
  );
}

export default observer(PrivateDocs);
