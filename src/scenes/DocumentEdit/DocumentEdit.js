import React, { Component } from 'react';
import { observer } from 'mobx-react';

import state from './DocumentEditState';

import Switch from 'components/Switch';
import Layout, { Title, HeaderAction } from 'components/Layout';
import Flex from 'components/Flex';
import MarkdownEditor from 'components/MarkdownEditor';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import SaveAction from './components/SaveAction';
import Preview from './components/Preview';
import EditorPane from './components/EditorPane';

import styles from './DocumentEdit.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

@observer
class DocumentEdit extends Component {
  componentDidMount = () => {
    state.documentId = this.props.params.id;
    state.fetchDocument();
  }

  onSave = () => {
    // if (this.props.title.length === 0) {
    //   alert("Please add a title before saving (hint: Write a markdown header)");
    //   return
    // }
    state.updateDocument();
  }

  state = {}

  onScroll = (scrollTop) => {
    this.setState({
      scrollTop: scrollTop,
    })
  }

  render() {
    let title = (
      <Title
        truncate={ 60 }
        placeholder={ "Untitle document" }
      >
        { state.title  }
      </Title>
    );
    const actions = (
      <Flex direction="row">
        <HeaderAction>
          <SaveAction
            onClick={ this.onSave }
            disabled={ state.isSaving }
          />
        </HeaderAction>
        <DropdownMenu label="More">
          <MenuItem onClick={ state.togglePreview }>
            Preview <Switch checked={ state.preview } />
          </MenuItem>
        </DropdownMenu>
      </Flex>
    );

    return (
      <Layout
        actions={ actions }
        title={ title }
        fixed={ true }
        loading={ state.isSaving }
      >
        { (state.isFetching) ? (
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>
        ) : (
          <div className={ styles.container }>
            <EditorPane
              fullWidth={ !state.preview }
              onScroll={ this.onScroll }
            >
              <MarkdownEditor
                onChange={ state.updateText }
                text={ state.text }
                replaceText={ state.replaceText }
              />
            </EditorPane>
            { state.preview ? (
              <EditorPane
                scrollTop={ this.state.scrollTop }
              >
                <Preview html={ state.htmlPreview } />
              </EditorPane>
            ) : null }
          </div>
        ) }
      </Layout>
    );
  }
}

export default DocumentEdit;
