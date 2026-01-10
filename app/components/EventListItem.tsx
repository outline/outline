import { observer } from "mobx-react";
import {
  TrashIcon,
  ArchiveIcon,
  PublishIcon,
  MoveIcon,
  UnpublishIcon,
  RestoreIcon,
  UserIcon,
  CrossIcon,
} from "outline-icons";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import type Event from "~/models/Event";
import Time from "~/components/Time";
import Logger from "~/utils/Logger";
import Text from "./Text";

type Props = {
  document: Document;
  item: Event<Document>;
};

const EventListItem = ({ item }: Props) => {
  const { t } = useTranslation();
  const opts = {
    userName: item.actor?.name,
  };
  let meta, icon;

  switch (item.name) {
    case "documents.archive":
      icon = <ArchiveIcon />;
      meta = t("{{userName}} archived", opts);
      break;

    case "documents.unarchive":
      icon = <RestoreIcon />;
      meta = t("{{userName}} restored", opts);
      break;

    case "documents.delete":
      icon = <TrashIcon />;
      meta = t("{{userName}} deleted", opts);
      break;
    case "documents.add_user":
      icon = <UserIcon />;
      meta = t("{{userName}} added {{addedUserName}}", {
        ...opts,
        addedUserName: item.user?.name ?? t("a user"),
      });
      break;
    case "documents.remove_user":
      icon = <CrossIcon />;
      meta = t("{{userName}} removed {{removedUserName}}", {
        ...opts,
        removedUserName: item.user?.name ?? t("a user"),
      });
      break;

    case "documents.restore":
      icon = <RestoreIcon />;
      meta = t("{{userName}} moved from trash", opts);
      break;

    case "documents.publish":
      icon = <PublishIcon />;
      meta = t("{{userName}} published", opts);
      break;

    case "documents.unpublish":
      icon = <UnpublishIcon />;
      meta = t("{{userName}} unpublished", opts);
      break;

    case "documents.move":
      icon = <MoveIcon />;
      meta = t("{{userName}} moved", opts);
      break;

    default:
      Logger.warn("Unhandled item", { item });
  }

  if (!meta) {
    return null;
  }

  return (
    <EventItem>
      <IconWrapper size="xsmall" type="secondary">
        {icon}
      </IconWrapper>
      <Text size="xsmall" type="secondary">
        {meta} &middot;{" "}
        <Time dateTime={item.createdAt} relative shorten addSuffix />
      </Text>
    </EventItem>
  );
};

export const lineStyle = css`
  &::before {
    content: "";
    display: block;
    position: absolute;
    top: -8px;
    left: 22px;
    width: 1px;
    height: calc(50% - 14px + 8px);
    background: ${s("divider")};
    mix-blend-mode: ${(props) => (props.theme.isDark ? "lighten" : "multiply")};
    z-index: 1;
  }

  &:first-child::before {
    display: none;
  }

  &:nth-child(2)::before {
    display: none;
  }

  &::after {
    content: "";
    display: block;
    position: absolute;
    top: calc(50% + 14px);
    left: 22px;
    width: 1px;
    height: calc(50% - 14px);
    background: ${s("divider")};
    mix-blend-mode: ${(props) => (props.theme.isDark ? "lighten" : "multiply")};
    z-index: 1;
  }

  &:last-child::after {
    display: none;
  }

  h3 + &::before {
    display: none;
  }
`;

const IconWrapper = styled(Text)`
  height: 24px;
  min-width: 24px;
`;

export const EventItem = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 8px 0;
  padding: 4px 10px;
  white-space: nowrap;
  position: relative;

  time {
    white-space: nowrap;
  }

  svg {
    flex-shrink: 0;
  }

  ${lineStyle}
`;

export default observer(EventListItem);
