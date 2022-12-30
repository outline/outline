import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import CollectionIcon from "~/components/CollectionIcon";
import Text from "~/components/Text";

type Props = {
  location: any;
  onSelect: (location: any) => void;
  selected: boolean;
  style?: React.CSSProperties;
};

function PublishLocation({ location, onSelect, selected, style }: Props) {
  const OFFSET = 12;
  const ICON_SIZE = 24;

  const titlePadding = location.depth ? location.depth * ICON_SIZE + OFFSET : 0;

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
    <Row selected={selected} onClick={handleSelect} style={style}>
      {location.data.type === "collection" && location.data.collection && (
        <CollectionIcon
          collection={location.data.collection}
          size={ICON_SIZE}
        />
      )}
      <Title $paddingLeft={titlePadding}>{location.data.title}</Title>
    </Row>
  );
}

const Title = styled(Text)<{ $paddingLeft: number }>`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: ${(props) => props.$paddingLeft}px;
  margin: 0 4px 0 4px;
  color: inherit;
`;

const Row = styled.span<{ selected: boolean }>`
  display: flex;
  user-select: none;
  max-width: calc(100% - 24px);

  color: ${(props) => props.theme.text};
  cursor: default;

  padding: 4px;

  svg {
    flex-shrink: 0;
  }

  border-radius: 6px;

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
