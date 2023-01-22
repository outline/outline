import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Disclosure from "~/components/Sidebar/components/Disclosure";
import Text from "~/components/Text";
import { ancestors } from "~/utils/tree";

type Props = {
  location: any;
  selected: boolean;
  active: boolean;
  style: React.CSSProperties;
  isSearchResult: boolean;
  expanded: boolean;
  icon?: React.ReactNode;

  onDisclosureClick: (ev: React.MouseEvent) => void;
  onPointerMove: (ev: React.MouseEvent) => void;
  onClick: (ev: React.MouseEvent) => void;
};

function PublishLocation({
  location,
  selected,
  active,
  style,
  isSearchResult,
  expanded,
  onDisclosureClick,
  onPointerMove,
  onClick,
  icon,
}: Props) {
  const { t } = useTranslation();
  const OFFSET = 12;
  const ICON_SIZE = 24;

  const hasChildren = location.children.length > 0;
  const isCollection = location.data.type === "collection";

  const width = location.depth
    ? location.depth * ICON_SIZE + OFFSET
    : ICON_SIZE;

  const path = (location: any) =>
    ancestors(location)
      .map((a) => a.data.title)
      .join(" / ");

  const ref = React.useCallback(
    (node: HTMLSpanElement | null) => {
      if (active && node) {
        scrollIntoView(node, {
          scrollMode: "if-needed",
          behavior: "auto",
          block: "start",
        });
      }
    },
    [active]
  );

  return (
    <Row
      ref={ref}
      selected={selected}
      active={active}
      onClick={onClick}
      style={style}
      onPointerMove={onPointerMove}
      role="option"
    >
      {!isSearchResult && (
        <Spacer width={width}>
          {hasChildren && (
            <StyledDisclosure
              expanded={expanded}
              onClick={onDisclosureClick}
              tabIndex={-1}
            />
          )}
        </Spacer>
      )}
      {icon}
      <Title>{location.data.title || t("Untitled")}</Title>
      {isSearchResult && !isCollection && (
        <Path $selected={selected} size="xsmall">
          {path(location)}
        </Path>
      )}
    </Row>
  );
}

const Title = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  margin: 0 4px 0 4px;
  color: inherit;
`;

const Path = styled(Text)<{ $selected: boolean }>`
  padding-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 4px 0 8px;
  color: ${(props) =>
    props.$selected ? props.theme.white50 : props.theme.textTertiary};
`;

const StyledDisclosure = styled(Disclosure)`
  position: relative;
  left: auto;
  margin-top: 2px;
`;

const Spacer = styled(Flex)<{ width: number }>`
  flex-direction: row-reverse;
  flex-shrink: 0;
  width: ${(props) => props.width}px;
`;

const Row = styled.span<{
  active: boolean;
  selected: boolean;
  style: React.CSSProperties;
}>`
  display: flex;
  user-select: none;
  overflow: hidden;
  font-size: 15px;
  width: ${(props) => props.style.width};
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  padding: 4px;
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
      background: ${props.theme.primary};
      color: ${props.theme.white};

      svg {
        fill: ${props.theme.white};
      }
    `}
`;

export default observer(PublishLocation);
