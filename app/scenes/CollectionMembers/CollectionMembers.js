// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { PlusIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';
import Button from 'components/Button';
import PaginatedMembersList from './components/PaginatedMembersList';
import Collection from 'models/Collection';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  collection: Collection,
};

@observer
class CollectionMembers extends React.Component<Props> {
  handleAddPeople = () => {
    // TODO
  };

  render() {
    const { collection, auth } = this.props;
    const { user } = auth;
    if (!user) return null;

    return (
      <Flex column>
        {collection.private ? (
          <React.Fragment>
            <HelpText>
              Choose which team members have access to view and edit documents
              in the private <strong>{collection.name}</strong> collection. You
              can make this collection visible to the entire team by changing
              its visibility.
            </HelpText>
            <span>
              <Button
                type="button"
                onClick={this.handleAddPeople}
                icon={<PlusIcon />}
                neutral
              >
                Add people…
              </Button>
            </span>
          </React.Fragment>
        ) : (
          <HelpText>
            The <strong>{collection.name}</strong> collection is accessible by
            everyone on the team. If you want to limit who can view the
            collection, make it private.
          </HelpText>
        )}

        <Subheading>Members</Subheading>
        <PaginatedMembersList collection={collection} currentUser={auth.user} />
      </Flex>
    );
  }
}

export default inject('auth')(CollectionMembers);
