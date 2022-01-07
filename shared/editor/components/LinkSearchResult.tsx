import * as React from "react";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";

type Props = {
  onClick: (event: React.MouseEvent) => void;
  onMouseOver: (event: React.MouseEvent) => void;
  icon: React.ReactNode;
  selected: boolean;
  title: string;
  subtitle?: string;
};

function LinkSearchResult({ title, subtitle, selected, icon, ...rest }: Props) {
  const ref = React.useCallback(
    node => {
      if (selected && node) {
        scrollIntoView(node, {
          scrollMode: "if-needed",
          block: "center",
          boundary: parent => {
            // All the parent elements of your target are checked until they
            // reach the #link-search-results. Prevents body and other parent
            // elements from being scrolled
            return parent.id !== "link-search-results";
          },
        });
      }
    },
    [selected]
  );

  return (
    <ListItem ref={ref} compact={!subtitle} selected={selected} {...rest}>
      <IconWrapper>{icon}</IconWrapper>
      <div>
        <Title>{title}</Title>
        {subtitle ? <Subtitle selected={selected}>{subtitle}</Subtitle> : null}
      </div>
    </ListItem>
  );
}

const IconWrapper = styled.span`
  flex-shrink: 0;
  margin-right: 4px;
  opacity: 0.8;
`;

const ListItem = styled.li<{
  selected: boolean;
  compact: boolean;
}>`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 2px;
  color: ${props => props.theme.toolbarItem};
  background: ${props =>
    props.selected ? props.theme.toolbarHoverBackground : "transparent"};
  font-family: ${props => props.theme.fontFamily};
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  line-height: ${props => (props.compact ? "inherit" : "1.2")};
  height: ${props => (props.compact ? "28px" : "auto")};
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const Subtitle = styled.div<{
  selected: boolean;
}>`
  font-size: 13px;
  opacity: ${props => (props.selected ? 0.75 : 0.5)};
`;

export default LinkSearchResult;
