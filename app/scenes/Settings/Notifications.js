// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import NotificationListItem from './components/NotificationListItem';

import UiStore from 'stores/UiStore';
import NotificationSettingsStore from 'stores/NotificationSettingsStore';

type Props = {
  ui: UiStore,
  notificationSettings: NotificationSettingsStore,
};

const options = [
  {
    event: 'documents.publish',
    title: 'Document published',
    description: 'Receive a notification whenever a new document is published',
  },
  {
    event: 'documents.update',
    title: 'Document updated',
    description: 'Receive a notification when a document you created is edited',
  },
  {
    event: 'collections.create',
    title: 'Collection created',
    description: 'Receive a notification whenever a new collection is created',
  },
  {
    event: 'summary.daily',
    title: 'Daily summary',
    description: 'Receive a daily summary of changes',
  },
  {
    event: 'summary.weekly',
    title: 'Weekly summary',
    description: 'Receive a weekly summary of changes',
  },
];

@observer
class Notifications extends React.Component<Props> {
  componentDidMount() {
    // TODO
  }

  handleChange = (ev: SyntheticInputEvent<*>) => {
    if (ev.target.checked) {
      this.props.notificationSettings.create({
        event: [ev.target.name],
      });
    } else {
      this.props.notificationSettings.delete({
        event: [ev.target.name],
      });
    }
  };

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Notifications" />
        <h1>Notifications</h1>

        <HelpText>
          Manage when you receive email notifications from Outline.
        </HelpText>

        {options.map(option => (
          <NotificationListItem
            key={option.event}
            onChange={this.handleChange}
            {...option}
          />
        ))}
      </CenteredContent>
    );
  }
}

export default inject('notificationSettings')(Notifications);
