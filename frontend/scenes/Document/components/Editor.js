// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styles from '../DocumentEdit.scss';
import EditorPane from './EditorPane';
import MarkdownEditor from 'components/MarkdownEditor';

const Editor = observer(props => {
  const store = props.store;

  return (
    <div className={styles.container}>
      <EditorPane onScroll={props.onScroll}>
        <MarkdownEditor
          onChange={store.updateText}
          text={store.text}
          onSave={props.onSave}
          onCancel={props.onCancel}
          readOnly={props.readOnly}
        />
      </EditorPane>
    </div>
  );
});

export default Editor;
