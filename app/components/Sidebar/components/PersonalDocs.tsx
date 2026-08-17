import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pagination } from "@shared/constants";
import type Document from "~/models/Document";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import { createPersonalDocument } from "~/actions/definitions/documents";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useSyncSidebarContext } from "~/hooks/useSyncSidebarContext";
import { useDropToReorderUserMembership } from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarAction from "./SidebarAction";
import SidebarContext, { type SidebarContextType } from "./SidebarContext";
import SidebarLink from "./SidebarLink";

const PersonalDocsList = observer(function PersonalDocsList() {
  const { documents, userMemberships } = useStores();
  const { t } = useTranslation();

  const { loading, next, end, error, page } = usePaginatedRequest<Document>(
    documents.fetchPersonal,
    { limit: Pagination.sidebarLimit }
  );

  const personal = documents.personal;

  // Drop to reorder document
  const [reorderProps, dropToReorderRef] = useDropToReorderUserMembership(() =>
    fractionalIndex(
      null,
      userMemberships.getByDocumentId(personal[0]?.id)?.index ?? null
    )
  );

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load personal documents"));
    }
  }, [error, t]);

  useSyncSidebarContext(
    useCallback(
      (context: NonNullable<SidebarContextType>) => context === "personal",
      []
    ),
    useCallback(
      (activeDocumentId: string) =>
        documents.get(activeDocumentId)?.isPersonalToMe
          ? "personal"
          : undefined,
      [documents]
    )
  );

  return (
    <SidebarContext.Provider value="personal">
      <Flex column>
        <Header id="personal" title={t("Personal")}>
          <Relative>
            {reorderProps.isDragging && (
              <DropCursor
                isActiveDrop={reorderProps.isOverCursor}
                innerRef={dropToReorderRef}
                position="top"
              />
            )}
            {personal
              .slice(0, page * Pagination.sidebarLimit)
              .map((document) => {
                // The membership carries sort position and the cached child
                // tree. Access comes from the document, so one that is missing
                // costs the row its disclosure rather than its place in the list.
                const membership = userMemberships.getByDocumentId(document.id);

                return membership ? (
                  <SharedWithMeLink key={document.id} membership={membership} />
                ) : (
                  <SidebarLink
                    key={document.id}
                    to={document.path}
                    label={document.titleWithDefault}
                    depth={0}
                  />
                );
              })}
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
            <SidebarAction action={createPersonalDocument} depth={0} />
          </Relative>
        </Header>
      </Flex>
    </SidebarContext.Provider>
  );
});

function PersonalDocs() {
  const team = useCurrentTeam();
  const can = usePolicy(team);

  // The list is a child component so that the documents are only requested
  // when the user is able to have personal documents at all.
  return can.createPersonalDocument ? <PersonalDocsList /> : null;
}

export default observer(PersonalDocs);
