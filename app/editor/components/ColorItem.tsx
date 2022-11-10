import * as React from "react";
import styled from "styled-components";

type Props = React.HTMLAttributes<HTMLLIElement> & {
  color: React.ReactNode;
  colorCode: string;
  selected: boolean;
  onClick: any;
};

function ColorItem({ color, colorCode, selected, onClick, ...rest }: Props) {
  return (
    <ListItem selected={selected} onClick={onClick} {...rest}>
      <ColorIcon style={{ color: colorCode }}>A</ColorIcon>
      <div>
        <Title>{color}</Title>
      </div>
    </ListItem>
  );
}

const ListItem = styled.li<{
  selected: boolean;
}>`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  color: ${(props) => props.theme.toolbarItem};
  background: ${(props) =>
    props.selected ? "rgba(255,255,255, 0.2)" : "transparent"};
  font-family: ${(props) => props.theme.fontFamily};
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  cursor: var(--pointer);
  user-select: none;
  line-height: "inherit";
  height: "28px";
  padding: 0 20px;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Title = styled.div`
  text-transform: capitalize;
  font-size: 14px;
  font-weight: 500;
  margin-left: 20px;
`;

const ColorIcon = styled.p`
  flex-shrink: 0;
  margin-right: 4px;
  font-size: 24px;
  font-weight: 600;
  text-transform: uppercase;
`;

export default ColorItem;
