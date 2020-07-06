// @flow
import * as React from "react";
import { Draggable as DnDDraggable } from "react-beautiful-dnd";

type Props = {
  draggableId: string,
  index: number,
  children: React.Node,
};

class Draggable extends React.Component<Props> {
  render() {
    const { draggableId, index, children } = this.props;

    return (
      <DnDDraggable draggableId={draggableId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            {children}
          </div>
        )}
      </DnDDraggable>
    );
  }
}

export default Draggable;
