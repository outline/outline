import React, { Component } from 'react';
import { observer } from 'mobx-react';

import store from './DocumentEditStore';

import Switch from 'components/Switch';
import Layout, { Title, HeaderAction } from 'components/Layout';
import Flex from 'components/Flex';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import EditorLoader from './components/EditorLoader';
import SaveAction from './components/SaveAction';

import styles from './DocumentEdit.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

@observer
class DocumentEdit extends Component {
  componentDidMount = () => {
    store.documentId = this.props.params.id;
    store.fetchDocument();

    EditorLoader()
    .then(({ Editor }) => {
      this.setState({ Editor });
    });
  }

  onSave = () => {
    // if (this.props.title.length === 0) {
    //   alert("Please add a title before saving (hint: Write a markdown header)");
    //   return
    // }
    store.updateDocument();
  }

  state = {
    scrollTop: 0,
  }

  onScroll = (scrollTop) => {
    this.setState({
      scrollTop: scrollTop,
    })
  }

  onPreviewToggle = () => {
    store.togglePreview();
  }

  render() {
    let title = (
      <Title
        truncate={ 60 }
        placeholder={ "Untitle document" }
      >
        { store.title  }
      </Title>
    );
    const actions = (
      <Flex direction="row">
        <HeaderAction>
          <SaveAction
            onClick={ this.onSave }
            disabled={ store.isSaving }
          />
        </HeaderAction>
        <DropdownMenu label="More">
          <MenuItem onClick={ this.onPreviewToggle }>
            Preview <Switch checked={ store.preview } />
          </MenuItem>
        </DropdownMenu>
      </Flex>
    );

    console.log(store.isFetching, this.state)

    return (
      <Layout
        actions={ actions }
        title={ title }
        fixed={ true }
        loading={ store.isSaving }
      >
        { (store.isFetching || !('Editor' in this.state)) ? (
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>
        ) : (
          <this.state.Editor
            store={ store }
            scrollTop={ this.state.scrollTop }
            onScroll={ this.onScroll }
          />
        ) }
      </Layout>
    );
  }
}

export default DocumentEdit;
