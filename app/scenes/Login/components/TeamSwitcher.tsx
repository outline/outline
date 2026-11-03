import { ArrowIcon } from "outline-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { s } from "@shared/styles";
import type { Sessions } from "@shared/utils/sessions";
import { isSessionActive } from "@shared/utils/sessions";
import { AvatarSize } from "~/components/Avatar";
import Avatar, { AvatarVariant } from "~/components/Avatar/Avatar";
import ChangeLanguage from "~/components/ChangeLanguage";
import Heading from "~/components/Heading";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import env from "~/env";
import { detectLanguage } from "~/utils/language";
import Login from "../Login";
import { Background } from "./Background";
import { Centered } from "./Centered";

interface Props {
  sessions: Sessions;
}

/**
 * Shows remembered workspaces with a login path for logged-out sessions.
 *
 * @param props the remembered workspace sessions.
 * @returns the workspace selector.
 */
export function TeamSwitcher({ sessions }: Props) {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
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
            "Choose an {{ appName }} workspace or log in to continue connecting this app",
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
              <WorkspaceName>
                {session.name}
                {!isSessionActive(session) && (
                  <Text type="tertiary" size="xsmall" weight="normal">
                    {t("Logged out")}
                  </Text>
                )}
              </WorkspaceName>
              <StyledArrowIcon />
            </TeamLink>
          );
        })}
        <TeamLink onClick={() => setShowLogin(true)}>
          <ArrowIcon size={AvatarSize.Large} />
          {t("Log in to workspace")}
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

const WorkspaceName = styled.span`
  display: flex;
  flex-direction: column;
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
