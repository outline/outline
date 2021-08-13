// @flow
import { observer } from "mobx-react";
import { DisconnectedIcon, ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import Fade from "components/Fade";
import Flex from "components/Flex";
import NudeButton from "components/NudeButton";
import TeamLogo from "components/TeamLogo";
import Tooltip from "components/Tooltip";
import useStores from "hooks/useStores";

type Props = {|
  teamName: string,
  subheading: React.Node,
  showDisclosure?: boolean,
  onClick: (event: SyntheticEvent<>) => void,
  logoUrl: string,
|};

const TeamButton = React.forwardRef<Props, any>(
  ({ showDisclosure, teamName, subheading, logoUrl, ...rest }: Props, ref) => {
    const { ui } = useStores();
    const theme = useTheme();
    const { t } = useTranslation();

    return (
      <Wrapper>
        <Header justify="flex-start" align="center" ref={ref} {...rest}>
          <TeamLogo
            alt={`${teamName} logo`}
            src={logoUrl}
            width={38}
            height={38}
          />
          <Flex align="flex-start" column>
            <TeamName showDisclosure>
              {teamName} {showDisclosure && <Disclosure color="currentColor" />}
            </TeamName>
            <Subheading>{subheading}</Subheading>
          </Flex>
          {(ui.multiplayerStatus === "connecting" ||
            ui.multiplayerStatus === "disconnected") && (
            <Tooltip
              tooltip={
                <Centered>
                  <strong>{t("Server connection lost")}</strong>
                  <br />
                  {t("Edits you make will sync once you’re online")}
                </Centered>
              }
              placement="bottom"
            >
              <IconWrapper>
                <Fade>
                  <DisconnectedIcon color={theme.sidebarText} />
                </Fade>
              </IconWrapper>
            </Tooltip>
          )}
        </Header>
      </Wrapper>
    );
  }
);

const IconWrapper = styled(NudeButton)`
  position: absolute;
  right: 16px;
`;

const Centered = styled.div`
  text-align: center;
`;

const Disclosure = styled(ExpandedIcon)`
  position: absolute;
  right: 0;
  top: 0;
`;

const Subheading = styled.div`
  padding-left: 10px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 500;
  white-space: nowrap;
  color: ${(props) => props.theme.sidebarText};
`;

const TeamName = styled.div`
  position: relative;
  padding-left: 10px;
  padding-right: 24px;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  white-space: nowrap;
  text-decoration: none;
  font-size: 16px;
`;

const Wrapper = styled.div`
  flex-shrink: 0;
  overflow: hidden;
`;

const Header = styled.button`
  display: flex;
  align-items: center;
  background: none;
  line-height: inherit;
  border: 0;
  padding: 8px;
  margin: 8px;
  border-radius: 4px;
  cursor: pointer;
  width: calc(100% - 16px);

  &:active,
  &:hover {
    transition: background 100ms ease-in-out;
    background: ${(props) => props.theme.sidebarItemBackground};
  }
`;

export default observer(TeamButton);
