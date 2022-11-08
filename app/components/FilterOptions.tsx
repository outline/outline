import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import User from "~/models/User";
import Button, { Inner } from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import Text from "~/components/Text";

type TFilterOption = {
  user?: User;
  avatarUrl?: string;
  key: string;
  label: string;
  note?: string;
};

type Props = {
  options: TFilterOption[];
  activeKey: string | null | undefined;
  defaultLabel?: string;
  selectedPrefix?: string;
  className?: string;
  onSelect: (key: string | null | undefined) => void;
  image?: React.ComponentType<{ model?: User; size: number }>;
};

const FilterOptions = ({
  options,
  activeKey = "",
  defaultLabel = "Filter options",
  selectedPrefix = "",
  className,
  onSelect,
  image: Image,
}: Props) => {
  const menu = useMenuState({
    modal: true,
  });
  const selected =
    options.find((option) => option.key === activeKey) || options[0];

  const selectedLabel = selected ? `${selectedPrefix} ${selected.label}` : "";

  let StyledImage: React.ComponentType<{ model?: User; size: number }>;
  if (Image) {
    StyledImage = styled(Image)`
      margin-right: 8px;
    `;
  }
  const isAuthorDropdown = defaultLabel === "Any author" ? true : false;
  const { t } = useTranslation();
  const isAuthorDropdown = defaultLabel === t("Any author") ? true : false;

  return (
    <Wrapper>
      <MenuButton {...menu}>
        {(props) => (
          <StyledButton {...props} className={className} neutral disclosure>
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
            {Image && <StyledImage model={option.user} size={20} />}
            {isAuthorDropdown && option.avatarUrl ? (
              <StyledAvatar src={option.avatarUrl} size={20} />
            ) : null}
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

const Note = styled(Text)`
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
  height: auto;

  &:hover {
    background: transparent;
  }

  ${Inner} {
    line-height: 24px;
    min-height: auto;
  }
`;

const Wrapper = styled.div`
  margin-right: 8px;
`;

export default FilterOptions;
