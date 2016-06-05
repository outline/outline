import React from 'react';
import { observer } from 'mobx-react';

import MarkdownEditor from 'components/MarkdownEditor';
import Preview from './Preview';
import EditorPane from './EditorPane';

import styles from '../DocumentEdit.scss';

const Editor = observer((props) => {
  const store = props.store;

  return (
    <div className={ styles.container }>
      <EditorPane
        fullWidth={ !store.preview }
        onScroll={ props.onScroll }
      >
        <MarkdownEditor
          onChange={ store.updateText }
          text={ store.text }
          replaceText={ store.replaceText }
          preview={ store.preview }
        />
      </EditorPane>
      { store.preview ? (
        <EditorPane
          scrollTop={ props.scrollTop }
        >
          <Preview html={ store.htmlPreview } />
        </EditorPane>
      ) : null }
    </div>
  );
});

export default Editor;