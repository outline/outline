import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { observer } from "mobx-react";
import { ClockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { depths, s, borderRadius } from "@shared/styles";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import Badge from "~/components/Badge";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Time from "~/components/Time";
import { usePortalContext } from "~/components/Portal";
import useMobile from "~/hooks/useMobile";
import type User from "~/models/User";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = {
  /** The user to display a profile card for. */
  user: User;
  /** Additional information to display alongside the user's activity. */
  info?: React.ReactNode;
  /** The preferred side of the trigger to render against when open. */
  side?: "top" | "right" | "bottom" | "left";
  /** The element that triggers the card on hover. */
  children: React.ReactNode;
};

/**
 * Displays a card with a summary of the given user's profile when the wrapped
 * element is hovered.
 */
export const UserHoverCard = ({ user, info, side, children }: Props) => {
  const container = usePortalContext();
  const isMobile = useMobile();

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <HoverCardPrimitive.Root openDelay={500} closeDelay={150}>
      <HoverCardPrimitive.Trigger asChild>
        {children}
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal container={container}>
        <Content side={side} sideOffset={8} collisionPadding={8}>
          <Profile user={user} info={info} />
        </Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
};

/**
 * The contents of the hover card, rendered only while the card is open so that
 * the per-minute clock updates do not affect avatars on the page.
 */
const Profile = observer(function Profile_({
  user,
  info,
}: Pick<Props, "user" | "info">) {
  const { t } = useTranslation();
  const localTime = user.localTime;

  return (
    <>
      <Flex gap={12} align="center">
        <Avatar model={user} size={AvatarSize.XLarge} />
        <Flex column justify="center">
          <NameRow>
            <Name>{user.name}</Name>
            {user.isAdmin ? (
              <RoleBadge primary>{t("Admin")}</RoleBadge>
            ) : user.isGuest ? (
              <RoleBadge>{t("Guest")}</RoleBadge>
            ) : null}
            {user.isSuspended && <RoleBadge>{t("Suspended")}</RoleBadge>}
          </NameRow>
          <Info>
            {user.isInvited ? (
              t("Invited")
            ) : user.isRecentlyActive ? (
              t("Online")
            ) : (
              <>
                {t("Last seen")} <Time dateTime={user.lastActiveAt} addSuffix />
              </>
            )}
          </Info>
        </Flex>
      </Flex>
      {(localTime || info) && (
        <>
          <Divider />
          <Flex column gap={8}>
            {localTime && (
              <Row>
                <ClockIcon size={18} />
                {t("{{ time }} local time", { time: localTime })}
              </Row>
            )}
            {info && <Row>{info}</Row>}
          </Flex>
        </>
      )}
    </>
  );
});

const NameRow = styled(Flex).attrs({ align: "center", gap: 4 })`
  min-width: 0;
`;

const Name = styled(Text).attrs({
  as: "h3",
  weight: "bold",
  ellipsis: true,
})`
  margin: 0;
  min-width: 0;
  font-size: 15px;
`;

// Scaled down from the default badge to sit comfortably beside the name.
const RoleBadge = styled(Badge)`
  flex-shrink: 0;
  margin: 0;
  padding: 1px 4.5px;
  border-radius: 6px;
  font-size: 10px;
`;

const Info = styled(Text).attrs({
  as: "p",
  type: "tertiary",
  size: "xsmall",
})`
  margin: 0;
  white-space: nowrap;
`;

const Divider = styled.div`
  height: 1px;
  margin: 12px 0;
  background: ${s("divider")};
`;

const Row = styled(Flex).attrs({ align: "center", gap: 8 })`
  color: ${s("textSecondary")};
  font-size: 13px;
  white-space: nowrap;

  svg {
    color: ${s("textTertiary")};
    flex-shrink: 0;
  }
`;

const Content = styled(HoverCardPrimitive.Content)`
  z-index: ${depths.tooltip};
  transform-origin: var(--radix-hover-card-content-transform-origin);
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  ${borderRadius(8)}
  padding: 12px;
  min-width: 180px;
  max-width: 320px;
  outline: none;
  user-select: none;

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms cubic-bezier(0.08, 0.82, 0.17, 1);
  }

  @media print {
    display: none;
  }
`;
