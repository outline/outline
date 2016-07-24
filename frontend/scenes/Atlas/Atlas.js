import React from 'react';
import { observer } from 'mobx-react';
import { Link, browserHistory } from 'react-router';
import keydown, { keydownScoped } from 'react-keydown';
import _ from 'lodash';

import store from './AtlasStore';

import Layout, { Title, HeaderAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DocumentList from 'components/DocumentList';
import Divider from 'components/Divider';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import Flex from 'components/Flex';

import styles from './Atlas.scss';

@keydown(['c'])
@observer
class Atlas extends React.Component {
  componentDidMount = () => {
    const { id } = this.props.params;
    store.fetchAtlas(id, data => {

      // Forward directly to root document
      if (data.type === 'atlas') {
        browserHistory.replace(data.navigationTree.url);
      }
    })
  }

  componentWillReceiveProps = (nextProps) => {
    const key = nextProps.keydown.event;
    if (key) {
      if (key.key === 'c') {
        _.defer(this.onCreate);
      }
    }
  }

  onCreate = (event) => {
    if (event) event.preventDefault();
    browserHistory.push(`/atlas/${store.atlas.id}/new`);
  }

  render() {
    const atlas = store.atlas;

    let actions;
    let title;
    let titleText;

    if (atlas) {
      actions = (
        <Flex direction="row">
          <DropdownMenu label={ <MoreIcon /> } >
            <MenuItem onClick={ this.onCreate }>
              New document
            </MenuItem>
          </DropdownMenu>
        </Flex>
      );
      title = <Title>{ atlas.name }</Title>;
      titleText = atlas.name;
    }

    return (
      <Layout
        actions={ actions }
        title={ title }
        titleText={ titleText }
      >
        <CenteredContent>
          { store.isFetching ? (
            <AtlasPreviewLoading />
          ) : (
            <div className={ styles.container }>
              <div className={ styles.atlasDetails }>
                <h2>{ atlas.name }</h2>
                <blockquote>
                  { atlas.description }
                </blockquote>
              </div>

              <Divider />

              <DocumentList documents={ atlas.recentDocuments } preview={ true } />
            </div>
          ) }
        </CenteredContent>
      </Layout>
    );
  }
}
export default Atlas;
