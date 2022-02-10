import { observer } from "mobx-react";
import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import TeamLogo from "~/components/TeamLogo";

type Props = {
  teamName: string;
  subheading: React.ReactNode;
  showDisclosure?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  logoUrl: string;
};

const TeamButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ showDisclosure, teamName, subheading, logoUrl, ...rest }: Props, ref) => (
    <Wrapper>
      <Header ref={ref} {...rest}>
        <TeamLogo
          alt={`${teamName} logo`}
          src={logoUrl}
          width={38}
          height={38}
        />
        <Flex align="flex-start" column>
          <TeamName>
            {teamName} {showDisclosure && <Disclosure color="currentColor" />}
          </TeamName>
          <Subheading>{subheading}</Subheading>
        </Flex>
      </Header>
    </Wrapper>
  )
);

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

  text-align: left;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
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
