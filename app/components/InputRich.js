// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Input, { LabelText, Outline } from 'components/Input';

type Props = {
  label: string,
  minHeight?: number,
  maxHeight?: number,
  readOnly?: boolean,
};

@observer
class InputRich extends React.Component<Props> {
  @observable editorComponent: *;

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
        {Editor ? (
          <StyledOutline maxHeight={maxHeight} minHeight={minHeight}>
            <Editor {...rest} />
          </StyledOutline>
        ) : (
          <Input
            maxHeight={maxHeight}
            minHeight={minHeight}
            placeholder="Loading…"
            disabled
          />
        )}
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

export default InputRich;
