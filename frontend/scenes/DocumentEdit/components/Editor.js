import React from 'react';
import { observer } from 'mobx-react';
import styles from '../DocumentEdit.scss';
import EditorPane from './EditorPane';
import Preview from './Preview';
import Editor from 'components/Editor';
import { convertToMarkdown } from 'utils/markdown';

const DocumentEdit = observer(props => {
  const store = props.store;

  return (
    <div className={styles.container}>
      <EditorPane fullWidth={!store.preview} onScroll={props.onScroll}>
        <Editor
          onChange={store.updateText}
          text={store.text}
          replaceText={store.replaceText}
          preview={store.preview}
          onSave={props.onSave}
          onCancel={props.onCancel}
          togglePreview={props.togglePreview}
          toggleUploadingIndicator={store.toggleUploadingIndicator}
        />
      </EditorPane>
      {store.preview
        ? <EditorPane scrollTop={props.scrollTop}>
            <Preview html={convertToMarkdown(store.text)} />
          </EditorPane>
        : null}
    </div>
  );
});

export default DocumentEdit;
