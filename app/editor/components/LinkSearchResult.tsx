import * as React from "react";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  icon: React.ReactNode;
  selected: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement>;
};

function LinkSearchResult({
  title,
  subtitle,
  containerRef,
  selected,
  icon,
  ...rest
}: Props) {
  const ref = React.useCallback(
    (node: HTMLElement | null) => {
      if (selected && node) {
        void scrollIntoView(node, {
          scrollMode: "if-needed",
          block: "center",
          boundary: (parent) =>
            // Prevents body and other parent elements from being scrolled
            parent !== containerRef.current,
        });
      }
    },
    [containerRef, selected]
  );

  return (
    <ListItem
      ref={ref}
      compact={!subtitle}
      selected={selected}
      role="menuitem"
      {...rest}
    >
      <IconWrapper selected={selected}>{icon}</IconWrapper>
      <Content>
        <Title>{title}</Title>
        {subtitle ? <Subtitle selected={selected}>{subtitle}</Subtitle> : null}
      </Content>
    </ListItem>
  );
}

const Content = styled.div`
  overflow: hidden;
`;

const IconWrapper = styled.span<{ selected: boolean }>`
  flex-shrink: 0;
  margin-right: 4px;
  height: 24px;
  opacity: 0.8;
  color: ${(props) =>
    props.selected ? props.theme.accentText : props.theme.toolbarItem};
`;

const ListItem = styled.div<{
  selected: boolean;
  compact: boolean;
}>`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  margin: 0 8px;
  color: ${(props) =>
    props.selected ? props.theme.accentText : props.theme.toolbarItem};
  background: ${(props) =>
    props.selected ? props.theme.accent : "transparent"};
  font-family: ${s("fontFamily")};
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  cursor: var(--pointer);
  user-select: none;
  line-height: ${(props) => (props.compact ? "inherit" : "1.2")};
  height: ${(props) => (props.compact ? "28px" : "auto")};
`;

const Title = styled.div`
  ${ellipsis()}
  font-size: 14px;
  font-weight: 500;
`;

const Subtitle = styled.div<{
  selected: boolean;
}>`
  ${ellipsis()}
  font-size: 13px;
  opacity: ${(props) => (props.selected ? 0.75 : 0.5)};
`;

export default LinkSearchResult;
