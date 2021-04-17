// @flow
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { MenuItem } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "components/Flex";
import HelpText from "components/HelpText";

type Props = {|
  label: string,
  note?: string,
  onSelect: () => void,
  active: boolean,
|};

const FilterOption = ({ label, note, onSelect, active, ...rest }: Props) => {
  return (
    <MenuItem onClick={active ? undefined : onSelect} {...rest}>
      {(props) => (
        <ListItem>
          <Button active={active} {...props}>
            <Flex align="center" justify="space-between">
              <span>
                {label}
                {note && <Description small>{note}</Description>}
              </span>
              {active && <Checkmark />}
            </Flex>
          </Button>
        </ListItem>
      )}
    </MenuItem>
  );
};

const Description = styled(HelpText)`
  margin-top: 2px;
  margin-bottom: 0;
  line-height: 1.2em;
`;

const Checkmark = styled(CheckmarkIcon)`
  flex-shrink: 0;
  padding-left: 4px;
  fill: ${(props) => props.theme.text};
`;

const Button = styled.button`
  display: flex;
  flex-direction: column;
  font-size: 16px;
  padding: 8px;
  margin: 0;
  border: 0;
  background: none;
  color: ${(props) => props.theme.text};
  text-align: left;
  font-weight: ${(props) => (props.active ? "600" : "normal")};
  justify-content: center;
  width: 100%;
  min-height: 42px;

  ${HelpText} {
    font-weight: normal;
    user-select: none;
  }

  &:hover {
    background: ${(props) => props.theme.listItemHoverBackground};
  }

  ${breakpoint("tablet")`
    padding: 4px 8px;
    font-size: 15px;
    min-height: 32px;
  `};
`;

const ListItem = styled("li")`
  list-style: none;
  max-width: 250px;
`;

export default FilterOption;
