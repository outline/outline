import { ArrowIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { s } from "@shared/styles";
import { AvatarSize } from "~/components/Avatar";
import Avatar, { AvatarVariant } from "~/components/Avatar/Avatar";
import ChangeLanguage from "~/components/ChangeLanguage";
import Heading from "~/components/Heading";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import env from "~/env";
import type { Sessions } from "~/hooks/useLoggedInSessions";
import { detectLanguage } from "~/utils/language";
import Login from "../Login";
import { Background } from "./Background";
import { Centered } from "./Centered";

type Props = { sessions: Sessions };

export function TeamSwitcher({ sessions }: Props) {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = React.useState(false);
  const url = new URL(window.location.href);
  const appName = env.APP_NAME;

  if (showLogin) {
    return <Login onBack={() => setShowLogin(false)} />;
  }

  return (
    <Background>
      <ChangeLanguage locale={detectLanguage()} />
      <Centered>
        <OutlineIcon size={AvatarSize.XXLarge} />

        <StyledHeading>{t("Choose a workspace")}</StyledHeading>
        <Text type="tertiary" as="p">
          {t(
            "Choose an {{ appName }} workspace or login to continue connecting this app",
            { appName }
          )}
          .
        </Text>
        {Object.keys(sessions)?.map((teamId) => {
          const session = sessions[teamId];
          const location = session.url + url.pathname + url.search;
          return (
            <TeamLink href={location} key={session.url}>
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
        <TeamLink onClick={() => setShowLogin(true)}>
          <ArrowIcon size={AvatarSize.Large} />
          {t("Login to workspace")}
        </TeamLink>
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
  left: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin: 4px;
  border-radius: 8px;
  width: 100%;
  color: ${s("text")};
  font-weight: ${s("fontWeightMedium")};

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
