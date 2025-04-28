import { ArrowIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { getCookie } from "tiny-cookie";
import Text from "@shared/components/Text";
import { s } from "@shared/styles";
import { AvatarSize } from "~/components/Avatar";
import Avatar, { AvatarVariant } from "~/components/Avatar/Avatar";
import Heading from "~/components/Heading";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import env from "~/env";
import { Background } from "./Background";
import { Centered } from "./Centered";

export function TeamSwitcher() {
  const sessions = useSessions();
  const { t } = useTranslation();
  const url = new URL(window.location.href);
  const appName = env.APP_NAME;

  return (
    <Background>
      <Centered>
        <OutlineIcon size={AvatarSize.XXLarge} />

        <StyledHeading>{t("Choose a workspace")}</StyledHeading>
        <Text type="tertiary" as="p">
          {t(
            "Choose an existing {{ appName }} workspace or login to continue connecting this app",
            { appName }
          )}
          .
        </Text>
        {Object.keys(sessions)?.map((teamId) => {
          const session = sessions[teamId];
          const location = session.url + url.pathname + url.search;
          return (
            <TeamLink href={location} key={session.id}>
              <Avatar
                variant={AvatarVariant.Square}
                model={{
                  avatarUrl: session.logoUrl,
                  initial: session.name[0],
                }}
                size={AvatarSize.Large}
                alt={session.name}
              />
              {session.name}
              <StyledArrowIcon />
            </TeamLink>
          );
        })}
      </Centered>
    </Background>
  );
}

const StyledArrowIcon = styled(ArrowIcon)`
  position: absolute;
  transition: all 0.2s ease-in-out;
  opacity: 0;
  right: 12px;
`;

const TeamLink = styled.a`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin: 0 -8px;
  border-radius: 8px;
  width: 100%;
  border-bottom: 1px solid ${s("divider")};
  color: ${s("text")};
  font-weight: ${s("fontWeightMedium")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${s("listItemHoverBackground")};

    ${StyledArrowIcon} {
      opacity: 1;
      right: 8px;
    }
  }
`;

const StyledHeading = styled(Heading).attrs({
  as: "h2",
  centered: true,
})`
  margin-top: 0;
`;

function useSessions() {
  return JSON.parse(getCookie("sessions") || "{}");
}
