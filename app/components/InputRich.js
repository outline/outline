// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { LabelText, Outline } from 'components/Input';

type Props = {
  label: string,
  minHeight?: number,
  maxHeight?: number,
  readOnly?: boolean,
  history: *,
  ui: *,
};

@observer
class InputRich extends React.Component<Props> {
  @observable editorComponent;

  componentDidMount() {
    this.loadEditor();
  }

  loadEditor = async () => {
    const EditorImport = await import('./Editor');
    this.editorComponent = EditorImport.default;
  };

  render() {
    const { label, minHeight, maxHeight, ...rest } = this.props;
    const Editor = this.editorComponent;

    return (
      <React.Fragment>
        <LabelText>{label}</LabelText>
        <StyledOutline maxHeight={maxHeight} minHeight={minHeight}>
          {Editor && <Editor {...rest} />}
        </StyledOutline>
      </React.Fragment>
    );
  }
}

const StyledOutline = styled(Outline)`
  padding: 8px 12px;
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : '0')};
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : 'auto')};
  overflow: scroll;

  > * {
    display: block;
  }
`;

export default inject('ui')(withRouter(InputRich));
