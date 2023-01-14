import { isUndefined } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Disclosure from "~/components/Sidebar/components/Disclosure";
import Text from "~/components/Text";

type Props = {
  location: any;
  onSelect: (location: any) => void;
  selected: boolean;
  active: boolean;
  style: React.CSSProperties;
  toggleExpansion: (location: any) => void;
  isSearchResult: boolean;
};

function PublishLocation({
  location,
  onSelect,
  toggleExpansion,
  selected,
  active,
  style,
  isSearchResult,
}: Props) {
  const OFFSET = 12;
  const ICON_SIZE = 24;

  const width = location.depth
    ? location.depth * ICON_SIZE + OFFSET
    : ICON_SIZE;

  const handleDisclosureClick = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    toggleExpansion(location);
  };

  const handleSelect = React.useCallback(
    (ev) => {
      ev.preventDefault();
      if (selected) {
        onSelect(null);
      } else {
        onSelect(location);
      }
    },
    [onSelect, location, selected]
  );

  return (
    <Row
      selected={selected}
      active={active}
      onClick={handleSelect}
      style={style}
    >
      <Spacer width={width}>
        {!isUndefined(location.data.expanded) && !isSearchResult && (
          <StyledDisclosure
            expanded={location.data.expanded}
            onClick={handleDisclosureClick}
            tabIndex={-1}
          />
        )}
      </Spacer>
      {location.data.type === "collection" && location.data.collection && (
        <CollectionIcon
          collection={location.data.collection}
          size={ICON_SIZE}
        />
      )}
      <Title>{location.data.title}</Title>
    </Row>
  );
}

const Title = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 4px 0 4px;
  color: inherit;
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
  width: ${(props) => props.style.width};

  color: ${(props) => props.theme.text};
  cursor: default;

  padding: 4px;

  svg {
    flex-shrink: 0;
  }

  border-radius: 6px;

  background: ${(props) =>
    !props.selected && props.active && props.theme.listItemHoverBackground};

  &:focus {
    outline: none;
  }

  &:hover {
    background: ${(props) =>
      !props.selected && props.theme.listItemHoverBackground};
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
