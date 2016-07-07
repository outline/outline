import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { browserHistory, withRouter } from 'react-router';

import DocumentEditStore, {
  DOCUMENT_EDIT_SETTINGS,
} from './DocumentEditStore';

import Switch from 'components/Switch';
import Layout, { Title, HeaderAction } from 'components/Layout';
import Flex from 'components/Flex';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import EditorLoader from './components/EditorLoader';
import SaveAction from './components/SaveAction';

const DISREGARD_CHANGES = `You have unsaved changes.
Are you sure you want to disgard them?`;

@withRouter
@observer
class DocumentEdit extends Component {
  static store;

  static propTypes = {
    route: React.PropTypes.object.isRequired,
    router: React.PropTypes.object.isRequired,
    params: React.PropTypes.object,
  }

  state = {
    scrollTop: 0,
  }

  constructor(props) {
    super(props);
    this.store = new DocumentEditStore(
      JSON.parse(localStorage[DOCUMENT_EDIT_SETTINGS] || '{}')
    );
  }

  componentDidMount = () => {
    if (this.props.route.newDocument) {
      this.store.atlasId = this.props.params.id;
      this.store.newDocument = true;
    } else if (this.props.route.newChildDocument) {
      this.store.documentId = this.props.params.id;
      this.store.newChildDocument = true;
      this.store.fetchDocument();
    } else {
      this.store.documentId = this.props.params.id;
      this.store.newDocument = false;
      this.store.fetchDocument();
    }

    // Load editor async
    EditorLoader()
    .then(({ Editor }) => {
      this.setState({ Editor });
    });

    // Set onLeave hook
    this.props.router.setRouteLeaveHook(this.props.route, () => {
      if (this.store.hasPendingChanges) {
        return confirm(DISREGARD_CHANGES);
      }
      return;
    });
  }

  onSave = () => {
    // if (this.props.title.length === 0) {
    //   alert("Please add a title before saving (hint: Write a markdown header)");
    //   return
    // }
    if (this.store.newDocument || this.store.newChildDocument) {
      this.store.saveDocument();
    } else {
      this.store.updateDocument();
    }
  }

  onCancel = () => {
    browserHistory.goBack();
  }

  onScroll = (scrollTop) => {
    this.setState({
      scrollTop,
    });
  }

  render() {
    console.log("DocumentEdit#render", this.store.preview);

    let title = (
      <Title
        truncate={ 60 }
        placeholder={ "Untitle document" }
      >
        { this.store.title }
      </Title>
    );

    let titleText = this.store.title;

    const actions = (
      <Flex direction="row">
        <HeaderAction>
          <SaveAction
            onClick={ this.onSave }
            disabled={ this.store.isSaving }
          />
        </HeaderAction>
        <DropdownMenu label="More">
          <MenuItem onClick={ this.store.togglePreview }>
            Preview <Switch checked={ this.store.preview } />
          </MenuItem>
          <MenuItem onClick={ this.onCancel }>
            Cancel
          </MenuItem>
        </DropdownMenu>
      </Flex>
    );

    return (
      <Layout
        actions={ actions }
        title={ title }
        titleText={ titleText }
        fixed
        loading={ this.store.isSaving }
      >
        { (this.store.isFetching || !('Editor' in this.state)) ? (
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>
        ) : (
          <this.state.Editor
            store={ this.store }
            scrollTop={ this.state.scrollTop }
            onScroll={ this.onScroll }
          />
        ) }
      </Layout>
    );
  }
}

export default DocumentEdit;
