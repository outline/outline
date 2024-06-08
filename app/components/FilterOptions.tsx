import * as React from "react";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button, { Inner } from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import Text from "~/components/Text";

type TFilterOption = {
  key: string;
  label: string;
  note?: string;
  icon?: React.ReactNode;
};

type Props = {
  options: TFilterOption[];
  selectedKeys: (string | null | undefined)[];
  defaultLabel?: string;
  selectedPrefix?: string;
  className?: string;
  onSelect: (key: string | null | undefined) => void;
};

const FilterOptions = ({
  options,
  selectedKeys = [],
  defaultLabel = "Filter options",
  selectedPrefix = "",
  className,
  onSelect,
}: Props) => {
  const menu = useMenuState({
    modal: true,
  });
  const selectedItems = options.filter((option) =>
    selectedKeys.includes(option.key)
  );

  const selectedLabel = selectedItems.length
    ? selectedItems
        .map((selected) => `${selectedPrefix} ${selected.label}`)
        .join(", ")
    : "";

  return (
    <div>
      <MenuButton {...menu}>
        {(props) => (
          <StyledButton {...props} className={className} neutral disclosure>
            {selectedItems.length ? selectedLabel : defaultLabel}
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
            selected={selectedKeys.includes(option.key)}
            {...menu}
          >
            {option.icon && <Icon>{option.icon}</Icon>}
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
    </div>
  );
};

const Note = styled(Text)`
  display: block;
  margin: 2px 0;
  line-height: 1.2em;
  font-size: 14px;
  font-weight: 500;
  color: ${s("textTertiary")};
`;

const LabelWithNote = styled.div`
  font-weight: 500;
  text-align: left;

  &:hover ${Note} {
    color: ${(props) => props.theme.white50};
  }
`;

export const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  border-color: transparent;
  height: auto;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 24px;
    min-height: auto;
  }
`;

const Icon = styled.div`
  margin-right: 8px;
  width: 18px;
  height: 18px;
`;

export default FilterOptions;
