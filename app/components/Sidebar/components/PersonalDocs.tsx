import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { DocumentIcon, PlusIcon } from "outline-icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { Pagination } from "@shared/constants";
import { UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { DocumentValidation } from "@shared/validations";
import type Document from "~/models/Document";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import DelayedMount from "~/components/DelayedMount";
import EditableTitle, { type RefHandle } from "~/components/EditableTitle";
import Flex from "~/components/Flex";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useSyncSidebarContext } from "~/hooks/useSyncSidebarContext";
import { documentEditPath } from "~/utils/routeHelpers";
import { useDropToReorderUserMembership } from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import DocumentMembershipLink from "./DocumentMembershipLink";
import SidebarAction from "./SidebarAction";
import SidebarContext, { type SidebarContextType } from "./SidebarContext";
import SidebarLink from "./SidebarLink";

function PersonalDocs() {
  const { documents, userMemberships } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const [isAddingNew, setIsAddingNew, closeAddingNew] = useBoolean();
  const newTitleRef = useRef<RefHandle>(null);

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

  // Opens a temporary row with an editable title, the document is only
  // created once a title is submitted.
  const newDocAction = useMemo(
    () =>
      createAction({
        name: ({ t, isMenu }) => (isMenu ? t("New document") : t("New doc")),
        analyticsName: "New personal document",
        section: DocumentSection,
        icon: <PlusIcon />,
        keywords: "create personal private",
        visible: !!can.createPersonalDocument,
        perform: setIsAddingNew,
      }),
    [can.createPersonalDocument, setIsAddingNew]
  );
  const headerActions = useMemo(() => [newDocAction], [newDocAction]);

  const handleNewDoc = useCallback(
    async (title: string) => {
      const newDocument = await documents.create(
        {
          title,
          fullWidth: user.getPreference(UserPreference.FullWidthDocuments),
          data: ProsemirrorDataHelper.getEmpty(),
        },
        { publish: true, personalOwnerId: user.id }
      );
      // The sidebar membership is created server-side, load it so the new row
      // takes its place in the list.
      await documents.fetchPersonal();
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext: "personal" },
      });
    },
    [documents, user, history]
  );

  const handleNewDocSubmit = useCallback(
    async (value: string) => {
      try {
        newTitleRef.current?.setIsEditing(false);
        await handleNewDoc(value);
        closeAddingNew();
      } catch (_err) {
        newTitleRef.current?.setIsEditing(true);
      }
    },
    [handleNewDoc, closeAddingNew]
  );

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

  // Creation can be disabled while existing personal documents remain readable.
  if (!can.createPersonalDocument && !personal.length) {
    return null;
  }

  return (
    <SidebarContext.Provider value="personal">
      <Flex column>
        <Header
          id="personal"
          title={t("Personal")}
          actions={can.createPersonalDocument ? headerActions : undefined}
          primaryAction={can.createPersonalDocument ? newDocAction : undefined}
        >
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
                  <DocumentMembershipLink
                    key={document.id}
                    membership={membership}
                  />
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
            {isAddingNew && can.createPersonalDocument && (
              <SidebarLink
                isActive={() => true}
                depth={0}
                icon={<DocumentIcon />}
                ellipsis={false}
                label={
                  <EditableTitle
                    title=""
                    canUpdate
                    isEditing
                    placeholder={`${t("New doc")}…`}
                    onCancel={closeAddingNew}
                    onSubmit={handleNewDocSubmit}
                    maxLength={DocumentValidation.maxTitleLength}
                    ref={newTitleRef}
                  />
                }
              />
            )}
            <SidebarAction action={newDocAction} depth={0} />
          </Relative>
        </Header>
      </Flex>
    </SidebarContext.Provider>
  );
}

export default observer(PersonalDocs);
