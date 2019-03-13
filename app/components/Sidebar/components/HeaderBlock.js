// @flow
import * as React from 'react';
import styled, { withTheme } from 'styled-components';
import { ExpandedIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import TeamLogo from 'shared/components/TeamLogo';

type Props = {
  teamName: string,
  subheading: string,
  showDisclosure?: boolean,
  logoUrl: string,
  theme: Object,
};

function HeaderBlock({
  showDisclosure,
  teamName,
  subheading,
  logoUrl,
  theme,
  ...rest
}: Props) {
  return (
    <Header justify="flex-start" align="center" {...rest}>
      <TeamLogo alt={`${teamName} logo`} src={logoUrl} />
      <Flex align="flex-start" column>
        <TeamName showDisclosure>
          {teamName}{' '}
          {showDisclosure && <StyledExpandedIcon color={theme.text} />}
        </TeamName>
        <Subheading>{subheading}</Subheading>
      </Flex>
    </Header>
  );
}

const StyledExpandedIcon = styled(ExpandedIcon)`
  position: absolute;
  right: 0;
  top: 0;
`;

const Subheading = styled.div`
  padding-left: 10px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 500;
  color: ${props => props.theme.sidebarText};
`;

const TeamName = styled.div`
  position: relative;
  padding-left: 10px;
  padding-right: 24px;
  font-weight: 600;
  color: ${props => props.theme.text};
  text-decoration: none;
  font-size: 16px;
`;

const Header = styled(Flex)`
  flex-shrink: 0;
  padding: 16px 24px;
  position: relative;
  cursor: pointer;
  width: 100%;

  &:active,
  &:hover {
    transition: background 100ms ease-in-out;
    background: rgba(0, 0, 0, 0.05);
  }
`;

export default withTheme(HeaderBlock);
