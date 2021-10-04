// @flow
import { find } from "lodash";
import * as React from "react";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import Button, { Inner } from "components/Button";
import ContextMenu from "components/ContextMenu";
import MenuItem from "components/ContextMenu/MenuItem";
import HelpText from "components/HelpText";

type TFilterOption = {|
  key: string,
  label: string,
  note?: string,
|};

type Props = {|
  options: TFilterOption[],
  activeKey: ?string,
  defaultLabel?: string,
  selectedPrefix?: string,
  className?: string,
  onSelect: (key: ?string) => void,
|};

const FilterOptions = ({
  options,
  activeKey = "",
  defaultLabel,
  selectedPrefix = "",
  className,
  onSelect,
}: Props) => {
  const menu = useMenuState({ modal: true });
  const selected = find(options, { key: activeKey }) || options[0];
  const selectedLabel = selected ? `${selectedPrefix} ${selected.label}` : "";

  return (
    <Wrapper>
      <MenuButton {...menu}>
        {(props) => (
          <StyledButton
            {...props}
            className={className}
            neutral
            disclosure
            small
          >
            {activeKey ? selectedLabel : defaultLabel}
          </StyledButton>
        )}
      </MenuButton>
      <ContextMenu aria-label={defaultLabel} {...menu}>
        {options.map((option) => (
          <MenuItem
            key={option.key}
            onClick={() => {
              onSelect(option.key);
              menu.hide();
            }}
            selected={option.key === activeKey}
            {...menu}
          >
            {option.note ? (
              <LabelWithNote>
                {option.label}
                <Note>{option.note}</Note>
              </LabelWithNote>
            ) : (
              option.label
            )}
          </MenuItem>
        ))}
      </ContextMenu>
    </Wrapper>
  );
};

const Note = styled(HelpText)`
  margin-top: 2px;
  margin-bottom: 0;
  line-height: 1.2em;
  font-size: 14px;
  font-weight: 400;
  color: ${(props) => props.theme.textTertiary};
`;

const LabelWithNote = styled.div`
  font-weight: 500;
  text-align: left;

  &:hover ${Note} {
    color: ${(props) => props.theme.white50};
  }
`;

const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 28px;
  }
`;

const Wrapper = styled.div`
  margin-right: 8px;
`;

export default FilterOptions;
