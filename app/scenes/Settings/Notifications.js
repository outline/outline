// @flow
import * as React from 'react';
import { debounce } from 'lodash';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import NotificationListItem from './components/NotificationListItem';
import Notice from 'shared/components/Notice';

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
    separator: true,
  },
  {
    event: 'emails.onboarding',
    title: 'Getting started',
    description:
      'Tips on getting started with Outline`s features and functionality',
  },
  {
    event: 'emails.features',
    title: 'New features',
    description: 'Receive an email when new features of note are added',
  },
];

@observer
class Notifications extends React.Component<Props> {
  componentDidMount() {
    this.props.notificationSettings.fetchPage();
  }

  handleChange = async (ev: SyntheticInputEvent<*>) => {
    const { notificationSettings } = this.props;
    const setting = notificationSettings.getByEvent(ev.target.name);

    if (ev.target.checked) {
      await notificationSettings.save({
        event: ev.target.name,
      });
    } else if (setting) {
      await notificationSettings.delete(setting);
    }

    this.showSuccessMessage();
  };

  showSuccessMessage = debounce(() => {
    this.props.ui.showToast('Notifications updated');
  }, 500);

  render() {
    const { notificationSettings } = this.props;
    const showSuccessNotice = window.location.search === '?success';

    return (
      <CenteredContent>
        {showSuccessNotice && (
          <Notice>
            Unsubscription successful. Your notification settings were updated
          </Notice>
        )}

        <PageTitle title="Notifications" />
        <h1>Notifications</h1>

        <HelpText>
          Manage when you receive email notifications from Outline.
        </HelpText>

        {options.map(option => {
          if (option.separator) return <Separator />;

          const setting = notificationSettings.getByEvent(option.event);

          return (
            <NotificationListItem
              key={option.event}
              onChange={this.handleChange}
              setting={setting}
              disabled={
                (setting && setting.isSaving) || notificationSettings.isFetching
              }
              {...option}
            />
          );
        })}
      </CenteredContent>
    );
  }
}

const Separator = styled.hr`
  padding-bottom: 12px;
`;

export default inject('notificationSettings', 'ui')(Notifications);
