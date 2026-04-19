import type { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import { EditIcon, TrashIcon } from "outline-icons";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { ellipsis, hover, s } from "@shared/styles";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import { ActionSeparator } from "~/actions";
import {
  copyLinkToRevision,
  downloadRevision,
  restoreRevision,
} from "~/actions/definitions/revisions";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Item, { Actions } from "~/components/List/Item";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import Time from "~/components/Time";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import { useMenuAction } from "~/hooks/useMenuAction";
import RevisionMenu from "~/menus/RevisionMenu";
import { documentHistoryPath } from "~/utils/routeHelpers";
import { EventItem, lineStyle } from "./EventListItem";
import Facepile from "~/components/Facepile";
import Text from "~/components/Text";
import { revisionCollaboratorText } from "./utils";

type Props = {
  document: Document;
  item: Revision;
};

const RevisionListItem = ({ item, document, ...rest }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarContext = useLocationSidebarContext();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();

  const isLatestRevision = RevisionHelper.latestId(document.id) === item.id;

  const ref = useRef<HTMLAnchorElement>(null);

  const actions = useMemo(
    () => [
      restoreRevision,
      ActionSeparator,
      copyLinkToRevision(item.id),
      downloadRevision(item.id),
    ],
    [item.id]
  );
  const contextMenuAction = useMenuAction(actions);

  // the time component tends to steal focus when clicked
  // ...so forward the focus back to the parent item
  const handleTimeClick = () => {
    ref.current?.focus();
  };

  let meta, icon, to: LocationDescriptor | undefined;

  if (item.deletedAt) {
    icon = <TrashIcon />;
    meta = t("Revision deleted");
  } else {
    icon = <EditIcon size={16} />;

    const collaboratorText = revisionCollaboratorText(item, t);

    meta = isLatestRevision ? (
      <>
        {t("Current version")} &middot; {collaboratorText}
      </>
    ) : (
      t("{{userName}} edited", { userName: collaboratorText })
    );
    to = {
      pathname: documentHistoryPath(
        document,
        isLatestRevision ? "latest" : item.id
      ),
      search: location.search,
      state: {
        sidebarContext,
        retainScrollPosition: true,
      },
    };
  }

  if (document.isDeleted) {
    to = undefined;
  }

  if (item.deletedAt) {
    return (
      <EventItem>
        <IconWrapper size="xsmall" type="secondary">
          {icon}
        </IconWrapper>
        <Text size="xsmall" type="secondary">
          {meta} &middot;{" "}
          <Time dateTime={item.deletedAt} relative shorten addSuffix />
        </Text>
      </EventItem>
    );
  }

  return (
    <ActionContextProvider value={{ activeModels: [document] }}>
      <ContextMenu
        action={contextMenuAction}
        ariaLabel={t("Revision options")}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      >
        <RevisionItem
          small
          exact
          to={to}
          title={
            <Time
              dateTime={item.createdAt}
              format={{
                en_US: "MMM do, h:mm a",
                fr_FR: "'Le 'd MMMM 'à' H:mm",
              }}
              relative={false}
              addSuffix
              onClick={handleTimeClick}
            />
          }
          image={
            item.collaborators ? (
              <Facepile users={item.collaborators} limit={3} />
            ) : (
              <Avatar model={item.createdBy} size={AvatarSize.Large} />
            )
          }
          subtitle={<Meta>{meta}</Meta>}
          actions={
            <StyledEventBoundary>
              <RevisionMenu document={document} revisionId={item.id} />
            </StyledEventBoundary>
          }
          ref={ref}
          $menuOpen={menuOpen}
          {...rest}
        />
      </ContextMenu>
    </ActionContextProvider>
  );
};

const Meta = styled.div`
  ${ellipsis()})
`;

const IconWrapper = styled(Text)`
  height: 24px;
  min-width: 24px;
`;

const StyledEventBoundary = styled(EventBoundary)`
  height: 24px;
`;

const RevisionItem = styled(Item)<{ $menuOpen?: boolean }>`
  border: 0;
  position: relative;
  margin: 8px 0;
  padding: 8px;
  border-radius: 8px;

  ${Actions} {
    opacity: 0;
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within,
  &:has([data-state="open"]) {
    background: ${s("listItemHoverBackground")};

    ${Actions} {
      opacity: 1;
    }
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${s("listItemHoverBackground")};

      ${Actions} {
        opacity: 1;
      }
    `}

  ${lineStyle}
`;

export default observer(RevisionListItem);
