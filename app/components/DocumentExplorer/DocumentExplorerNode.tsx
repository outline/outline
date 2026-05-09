import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import Disclosure from "~/components/Sidebar/components/Disclosure";
import Text from "~/components/Text";

type Props = {
  /** Whether this node is the chosen destination (committed pick via click or Enter). */
  selected: boolean;
  /** Whether this node is currently highlighted by pointer hover or keyboard navigation. */
  active: boolean;
  /** Inline style passed in by the virtualized list for absolute positioning. */
  style: React.CSSProperties;
  /** Whether this node's children are currently revealed in the tree. */
  expanded: boolean;
  /** Icon rendered before the title (document icon, emoji, or star). */
  icon?: React.ReactNode;
  /** Display title for the node. */
  title: string;
  /** Zero-based nesting depth, used to indent the node. */
  depth: number;
  /** Whether this node has descendants and should render a disclosure chevron. */
  hasChildren: boolean;
  /** Fired when the disclosure chevron is clicked to expand or collapse the node. */
  onDisclosureClick: (ev: React.MouseEvent) => void;
  /** Fired on pointer movement over the node; used to update the active highlight. */
  onPointerMove: (ev: React.MouseEvent) => void;
  /** Fired when the node is clicked to toggle its selection. */
  onClick: (ev: React.MouseEvent) => void;
};

function DocumentExplorerNode(
  {
    selected,
    active,
    style,
    expanded,
    icon,
    title,
    depth,
    hasChildren,
    onDisclosureClick,
    onPointerMove,
    onClick,
  }: Props,
  ref: React.RefObject<HTMLSpanElement>
) {
  const { t } = useTranslation();
  const DISCLOSURE = 24;
  const width = (depth + 2) * DISCLOSURE;

  return (
    <Node
      ref={ref}
      selected={selected}
      active={active}
      onClick={onClick}
      style={style}
      onPointerMove={onPointerMove}
      role="option"
      aria-selected={selected}
    >
      <Spacer width={width}>
        {hasChildren && (
          <StyledDisclosure
            expanded={expanded}
            onClick={onDisclosureClick}
            tabIndex={-1}
          />
        )}
      </Spacer>
      {icon}
      <Title>{title || t("Untitled")}</Title>
    </Node>
  );
}

const Title = styled(Text)`
  ${ellipsis()}
  margin: 0 4px 0 4px;
  color: inherit;
`;

const StyledDisclosure = styled(Disclosure)`
  position: relative;
  left: auto;
  margin: 2px 0;

  &&[aria-expanded="true"]:not(:hover) {
    background: none;
  }
`;

const Spacer = styled(Flex)<{ width: number }>`
  flex-direction: row-reverse;
  flex-shrink: 0;
  width: ${(props) => props.width}px;
`;

export const Node = styled.span<{
  active: boolean;
  selected: boolean;
  style: React.CSSProperties;
}>`
  display: flex;
  user-select: none;
  overflow: hidden;
  font-size: 16px;
  width: ${(props) => props.style.width};
  color: ${s("text")};
  cursor: var(--pointer);
  padding: 12px;
  border-radius: 6px;
  background: ${(props) =>
    !props.selected && props.active && props.theme.listItemHoverBackground};

  svg {
    flex-shrink: 0;
  }

  &:focus {
    outline: none;
  }

  ${(props) =>
    props.selected &&
    `
      background: ${props.theme.accent};
      color: ${props.theme.white};

      svg {
        color: ${props.theme.white};
        fill: ${props.theme.white};
      }
    `}

  ${breakpoint("tablet")`
    padding: 4px;
    font-size: 15px;
  `}
`;

export default observer(React.forwardRef(DocumentExplorerNode));
