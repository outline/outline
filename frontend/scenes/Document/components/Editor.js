// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styles from '../DocumentEdit.scss';
import EditorPane from './EditorPane';
import MarkdownEditor from 'components/MarkdownEditor';

const Editor = observer(props => {
  return (
    <div className={styles.container}>
      <EditorPane onScroll={props.onScroll}>
        <MarkdownEditor
          onChange={props.onChange}
          text={props.text}
          onSave={props.onSave}
          onCancel={props.onCancel}
          readOnly={props.readOnly}
        />
      </EditorPane>
    </div>
  );
});

export default Editor;
