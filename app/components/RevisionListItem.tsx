import { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import { EditIcon, TrashIcon } from "outline-icons";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { hover } from "@shared/styles";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Item, { Actions } from "~/components/List/Item";
import Time from "~/components/Time";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import RevisionMenu from "~/menus/RevisionMenu";
import { documentHistoryPath } from "~/utils/routeHelpers";
import { EventItem, lineStyle } from "./EventListItem";
import Facepile from "./Facepile";
import Text from "./Text";
import useClickIntent from "~/hooks/useClickIntent";

type Props = {
  document: Document;
  item: Revision;
};

const RevisionListItem = ({ item, document, ...rest }: Props) => {
  const { t } = useTranslation();
  const { revisions } = useStores();
  const location = useLocation();
  const sidebarContext = useLocationSidebarContext();
  const revisionLoadedRef = useRef(false);

  const isLatestRevision = RevisionHelper.latestId(document.id) === item.id;

  const ref = useRef<HTMLAnchorElement>(null);

  // the time component tends to steal focus when clicked
  // ...so forward the focus back to the parent item
  const handleTimeClick = () => {
    ref.current?.focus();
  };

  const prefetchRevision = useCallback(async () => {
    if (!document.isDeleted && !item.deletedAt && !revisionLoadedRef.current) {
      if (isLatestRevision) {
        return;
      }
      await revisions.fetch(item.id, { force: true });
      revisionLoadedRef.current = true;
    }
  }, [document.isDeleted, item.deletedAt, isLatestRevision, revisions]);

  const { handleMouseEnter, handleMouseLeave } =
    useClickIntent(prefetchRevision);

  let meta, icon, to: LocationDescriptor | undefined;

  if (item.deletedAt) {
    icon = <TrashIcon />;
    meta = t("Revision deleted");
  } else {
    icon = <EditIcon size={16} />;
    meta = isLatestRevision ? (
      <>
        {t("Current version")} &middot; {item.createdBy?.name}
      </>
    ) : (
      t("{{userName}} edited", { userName: item.createdBy?.name })
    );
    to = {
      pathname: documentHistoryPath(
        document,
        isLatestRevision ? "latest" : item.id
      ),
      state: {
        sidebarContext,
        retainScrollPosition: true,
      },
    };
  }

  const isActive =
    typeof to === "string"
      ? location.pathname === to
      : location.pathname === to?.pathname;

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
      subtitle={meta}
      actions={
        isActive ? (
          <StyledEventBoundary>
            <RevisionMenu document={document} revisionId={item.id} />
          </StyledEventBoundary>
        ) : undefined
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={ref}
      {...rest}
    />
  );
};

const IconWrapper = styled(Text)`
  height: 24px;
  min-width: 24px;
`;

const StyledEventBoundary = styled(EventBoundary)`
  height: 24px;
`;

const RevisionItem = styled(Item)`
  border: 0;
  position: relative;
  margin: 8px 0;
  padding: 8px;
  border-radius: 8px;

  ${lineStyle}

  ${Actions} {
    opacity: 0.5;

    &: ${hover} {
      opacity: 1;
    }
  }
`;

export default observer(RevisionListItem);
