// @flow
import * as React from 'react';
import Editor from 'components/Editor';
import ClickablePadding from 'components/ClickablePadding';
import plugins from './plugins';

type Props = {
  defaultValue?: string,
  readOnly?: boolean,
};

class DocumentEditor extends React.Component<Props> {
  editor: *;

  componentDidMount() {
    if (!this.props.defaultValue) {
      setImmediate(this.focusAtStart);
    }
  }

  focusAtStart = () => {
    if (this.editor) this.editor.focusAtStart();
  };

  focusAtEnd = () => {
    if (this.editor) this.editor.focusAtEnd();
  };

  render() {
    const { readOnly } = this.props;

    return (
      <React.Fragment>
        <Editor
          ref={ref => (this.editor = ref)}
          plugins={plugins}
          {...this.props}
        />
        <ClickablePadding
          onClick={!readOnly ? this.focusAtEnd : undefined}
          grow
        />
      </React.Fragment>
    );
  }
}

export default DocumentEditor;
