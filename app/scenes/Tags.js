// @flow
import * as React from 'react';
import { Link } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import { NewDocumentIcon } from 'outline-icons';

import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import Heading from 'components/Heading';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action } from 'components/Actions';
import TagsStore from 'stores/TagsStore';

type Props = {
  tags: TagsStore,
};

@observer
class Tags extends React.Component<Props> {
  componentDidMount() {
    this.props.tags.fetchPage();
  }

  render() {
    const { tags } = this.props;
    const { isLoaded, isFetching } = tags;
    const showLoading = !isLoaded && isFetching;
    const showEmpty = isLoaded && !tags.orderedData.length;

    return (
      <CenteredContent column auto>
        <PageTitle title="Tags" />
        <Heading>Tags</Heading>
        {showLoading && <ListPlaceholder />}
        {showEmpty && <Empty>You’ve not got any tagged documents yet.</Empty>}
        <ol>
          {tags.orderedData.map(tag => (
            <li key={tag.id}>
              <Link to={`/tags/${tag.name}`}>#{tag.name}</Link>
            </li>
          ))}
        </ol>
        <Actions align="center" justify="flex-end">
          <Action>
            <NewDocumentMenu label={<NewDocumentIcon />} />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('tags')(Tags);
