// @flow
import * as React from 'react';
import * as dnd from 'react-beautiful-dnd';
import styled, { withTheme } from 'styled-components';
import {
  DROPPABLE_COLLECTION_SUFFIX,
  DROPPABLE_DOCUMENT_SUFFIX,
  DROPPABLE_DOCUMENT_SEPARATOR,
} from 'utils/dnd';

type Props = {
  collectionId: string,
  documentId?: string,
  isDropDisabled?: boolean,
  children?: React.Node,
};

class Droppable extends React.Component<Props> {
  static defaultProps = {
    isDropDisabled: false,
  };

  render() {
    const { collectionId, documentId, isDropDisabled, children } = this.props;
    let droppableId;

    if (documentId) {
      droppableId = `${DROPPABLE_DOCUMENT_SUFFIX}${documentId}${
        DROPPABLE_DOCUMENT_SEPARATOR
      }${collectionId}`;
    } else {
      droppableId = `${DROPPABLE_COLLECTION_SUFFIX}${collectionId}`;
    }

    return (
      <dnd.Droppable droppableId={droppableId} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <DropContainer
            isDraggingOver={snapshot.isDraggingOver}
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {children}
            {provided.placeholder}
          </DropContainer>
        )}
      </dnd.Droppable>
    );
  }
}

const DropContainer = styled.div(props => ({
  backgroundColor: props.isDraggingOver
    ? props.theme.sidebarDroppableBackground
    : undefined,
}));

export default withTheme(Droppable);
