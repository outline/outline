// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styles from '../DocumentEdit.scss';
import EditorPane from './EditorPane';
import Editor from 'components/Editor';

const DocumentEdit = observer(props => {
  const store = props.store;

  return (
    <div className={styles.container}>
      <EditorPane onScroll={props.onScroll}>
        <Editor
          onChange={store.updateText}
          text={store.text}
          onSave={props.onSave}
          onCancel={props.onCancel}
        />
      </EditorPane>
    </div>
  );
});

export default DocumentEdit;
