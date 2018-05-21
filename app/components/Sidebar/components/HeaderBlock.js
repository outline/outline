// @flow
import * as React from 'react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';
import { ExpandedIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import TeamLogo from './TeamLogo';

type Props = {
  teamName: string,
  subheading: string,
  showDisclosure?: boolean,
  logoUrl: string,
};

function HeaderBlock({
  showDisclosure,
  teamName,
  subheading,
  logoUrl,
  ...rest
}: Props) {
  return (
    <Header justify="flex-start" align="center" {...rest}>
      <TeamLogo src={logoUrl} />
      <Flex align="flex-start" column>
        <TeamName showDisclosure>
          {teamName}{' '}
          {showDisclosure && <StyledExpandedIcon color={color.text} />}
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
  color: ${color.slateDark};
`;

const TeamName = styled.div`
  position: relative;
  padding-left: 10px;
  padding-right: 24px;
  font-weight: 600;
  color: ${color.text};
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

export default HeaderBlock;
