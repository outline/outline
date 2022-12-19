import { isUndefined } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import CollectionIcon from "~/components/CollectionIcon";

type Props = {
  location: any;
};

function PublishLocation({ location }: Props) {
  const leadingSpaceWidth = location.depth ? location.depth * 24 + 12 : 0;

  return (
    <Row>
      <Spacer width={leadingSpaceWidth} />
      {location.data.type === "collection" && location.data.collection && (
        <CollectionIcon collection={location.data.collection} />
      )}
      <Title>{location.data.title}</Title>
    </Row>
  );
}

const Title = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 4px;
`;

const Spacer = styled.span<{ width?: number; height?: number }>`
  width: ${(props) => (isUndefined(props.width) ? 0 : props.width)}px;
  height: ${(props) => (isUndefined(props.height) ? 0 : props.height)}px;
`;

const Row = styled.span`
  display: flex;
  user-select: none;

  color: ${(props) => props.theme.text};
  cursor: default;

  padding: 4px;

  svg {
    flex-shrink: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};
    outline: none;
    border-radius: 6px;
  }
`;

export default observer(PublishLocation);
