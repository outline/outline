// @flow
import * as React from "react";
import ReactDOM from "react-dom";
import { Draggable as DnDDraggable } from "react-beautiful-dnd";
import type {
  DraggableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import styled, { withTheme } from "styled-components";

type Props = {
  draggableId: string,
  index: number,
  children: React.Node,
};

type InnerProps = {
  provided: DraggableProvided,
  snapshot: DraggableStateSnapshot,
  children: React.Node,
};

class Inner extends React.Component<InnerProps> {
  render() {
    const { provided, snapshot, children } = this.props;

    const child = (
      <DropContainer
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        isDraggingOver={Boolean(snapshot.combineTargetFor)}
      >
        {children}
      </DropContainer>
    );

    const portalContainer = document.getElementById(
      "sidebar-collections-portal"
    );

    if (snapshot.isDragging && portalContainer) {
      return ReactDOM.createPortal(child, portalContainer);
    }

    return child;
  }
}

class Draggable extends React.Component<Props> {
  render() {
    const { draggableId, index, children } = this.props;

    return (
      <DnDDraggable draggableId={draggableId} index={index}>
        {(provided, snapshot) => (
          <Inner provided={provided} snapshot={snapshot}>
            {children}
          </Inner>
        )}
      </DnDDraggable>
    );
  }
}

const DropContainer = styled.div(props => ({
  backgroundColor: props.isDraggingOver
    ? props.theme.sidebarDroppableBackground
    : undefined,
}));

export default withTheme(Draggable);
