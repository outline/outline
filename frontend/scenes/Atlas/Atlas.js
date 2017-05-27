// @flow
import React from 'react';
import { observer } from 'mobx-react';
import keydown from 'react-keydown';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import _ from 'lodash';

// TODO move here argh
import store from './AtlasStore';

import Layout, { Title } from 'components/Layout';
import PreviewLoading from 'components/PreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DocumentList from 'components/DocumentList';
import Divider from 'components/Divider';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import { Flex } from 'reflexbox';

import styles from './Atlas.scss';

type Props = {
  params: Object,
  history: Object,
  match: Object,
  keydown: Object,
};

@keydown(['c'])
@observer
class Atlas extends React.Component {
  props: Props;

  componentDidMount = () => {
    const { id } = this.props.match.params;
    store.fetchCollection(id, data => {
      // Forward directly to root document
      if (data.type === 'atlas') {
        this.props.history.replace(data.navigationTree.url);
      }
    });
  };

  componentWillReceiveProps = (nextProps: Props) => {
    const key = nextProps.keydown.event;
    if (key) {
      if (key.key === 'c') {
        _.defer(this.onCreate);
      }
    }
  };

  onCreate = (event: Event) => {
    if (event) event.preventDefault();
    store.collection && this.props.history.push(`${store.collection.url}/new`);
  };

  render() {
    const collection = store.collection;

    let actions;
    let title;
    let titleText;

    if (collection) {
      actions = (
        <Flex>
          <DropdownMenu label={<MoreIcon />}>
            <MenuItem onClick={this.onCreate}>
              New document
            </MenuItem>
          </DropdownMenu>
        </Flex>
      );
      title = <Title content={collection.name} />;
      titleText = collection.name;
    }

    return (
      <Layout actions={actions} title={title} titleText={titleText}>
        <CenteredContent>
          <ReactCSSTransitionGroup
            transitionName="fadeIn"
            transitionAppear
            transitionAppearTimeout={0}
            transitionEnterTimeout={0}
            transitionLeaveTimeout={0}
          >
            {store.isFetching
              ? <PreviewLoading />
              : collection &&
                  <div className={styles.container}>
                    <div className={styles.atlasDetails}>
                      <h2>{collection.name}</h2>
                      <blockquote>
                        {collection.description}
                      </blockquote>
                    </div>

                    <Divider />

                    <DocumentList
                      documents={collection.recentDocuments}
                      preview
                    />
                  </div>}
          </ReactCSSTransitionGroup>
        </CenteredContent>
      </Layout>
    );
  }
}
export default Atlas;
